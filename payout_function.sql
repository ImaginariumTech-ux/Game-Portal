-- MagicGames Payout Engine (v2 - Replay Support)
-- This function handles the atomic distribution of coins and RESETS the room for replay

CREATE OR REPLACE FUNCTION process_game_payout(
  p_room_id UUID,
  p_results JSONB -- Array of {user_id: UUID, rank: INT, score: NUMERIC}
) RETURNS JSONB AS $$
DECLARE
  v_stake NUMERIC;
  v_payout_type TEXT;
  v_payout_config JSONB;
  v_total_players INT;
  v_total_pot NUMERIC;
  v_platform_fee NUMERIC;
  v_net_pot NUMERIC;
  v_player RECORD;
  v_payout_percent NUMERIC;
  v_payout_amount NUMERIC;
  v_processed_count INT := 0;
BEGIN
  -- 1. Fetch Room Config
  SELECT stake_amount, payout_type, payout_config 
  INTO v_stake, v_payout_type, v_payout_config
  FROM game_rooms WHERE id = p_room_id AND status = 'live'; -- Only process live games

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found or not in live state');
  END IF;

  -- 2. Calculate Pot
  SELECT count(*) INTO v_total_players FROM room_players WHERE room_id = p_room_id AND status = 'joined';
  
  IF v_total_players = 0 THEN
     UPDATE game_rooms SET status = 'open' WHERE id = p_room_id;
     RETURN jsonb_build_object('success', true, 'message', 'No players found, room reset to open');
  END IF;

  v_total_pot := v_stake * v_total_players;
  v_platform_fee := v_total_pot * 0.05; -- 5% Platform Fee
  v_net_pot := v_total_pot - v_platform_fee;

  -- 3. Process each result
  FOR v_player IN SELECT * FROM jsonb_to_recordset(p_results) AS x(user_id UUID, rank INT, score NUMERIC)
  LOOP
    -- Update room_players with final rank and score
    UPDATE room_players 
    SET rank = v_player.rank, 
        score = v_player.score, 
        is_winner = (v_player.rank = 1),
        is_ready = false -- RESET READY STATUS FOR REPLAY
    WHERE room_id = p_room_id AND user_id = v_player.user_id;

    -- Calculate Payout
    v_payout_percent := COALESCE((v_payout_config->>(v_player.rank::text))::NUMERIC, 0);
    v_payout_amount := (v_net_pot * v_payout_percent) / 100;

    -- Process Payout
    IF v_payout_amount > 0 AND v_stake > 0 THEN
      INSERT INTO user_wallets (user_id, balance, total_earned)
      VALUES (v_player.user_id, v_payout_amount, v_payout_amount)
      ON CONFLICT (user_id) DO UPDATE SET 
        balance = user_wallets.balance + EXCLUDED.balance,
        total_earned = user_wallets.total_earned + EXCLUDED.total_earned,
        updated_at = NOW();

      INSERT INTO wallet_transactions (user_id, amount, type, reference_id, description)
      VALUES (v_player.user_id, v_payout_amount, 'game_win', p_room_id, 'Match Prize Payout');
    END IF;

    v_processed_count := v_processed_count + 1;
  END LOOP;

  -- 4. Reset Room status instead of dissolving
  UPDATE game_rooms 
  SET status = 'open', -- Back to lobby mode
      updated_at = NOW()
  WHERE id = p_room_id;

  RETURN jsonb_build_object(
    'success', true, 
    'processed_players', v_processed_count, 
    'total_pot', v_total_pot,
    'net_pot', v_net_pot,
    'status', 'reset_to_open'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
