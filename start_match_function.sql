-- MagicGames Match Start Engine
-- This function handles deducting stakes from players when a match starts

CREATE OR REPLACE FUNCTION start_game_match(
  p_room_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_stake NUMERIC;
  v_room_status TEXT;
  v_player RECORD;
  v_insufficient_players TEXT[];
  v_processed_count INT := 0;
BEGIN
  -- 1. Fetch Room Config
  SELECT stake_amount, status INTO v_stake, v_room_status
  FROM game_rooms WHERE id = p_room_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF v_room_status != 'open' AND v_room_status != 'forming' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room is already in progress or closed');
  END IF;

  -- 2. Check for insufficient balances if stake > 0
  IF v_stake > 0 THEN
    SELECT ARRAY_AGG(p.full_name) INTO v_insufficient_players
    FROM room_players rp
    JOIN profiles p ON p.id = rp.user_id
    LEFT JOIN user_wallets uw ON uw.user_id = rp.user_id
    WHERE rp.room_id = p_room_id 
      AND rp.status = 'joined'
      AND (COALESCE(uw.balance, 0) < v_stake);

    IF v_insufficient_players IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Insufficient funds', 
        'players', v_insufficient_players
      );
    END IF;

    -- 3. Deduct Stakes
    FOR v_player IN SELECT user_id FROM room_players WHERE room_id = p_room_id AND status = 'joined'
    LOOP
      -- Update Wallet
      UPDATE user_wallets 
      SET balance = balance - v_stake,
          total_spent = total_spent + v_stake,
          updated_at = NOW()
      WHERE user_id = v_player.user_id;

      -- Record Transaction
      INSERT INTO wallet_transactions (user_id, amount, type, reference_id, description)
      VALUES (v_player.user_id, -v_stake, 'game_entry', p_room_id, 'Match Entry Fee');

      v_processed_count := v_processed_count + 1;
    END LOOP;
  END IF;

  -- 4. Set Room to Live
  UPDATE game_rooms SET status = 'live' WHERE id = p_room_id;

  RETURN jsonb_build_object(
    'success', true, 
    'processed_players', v_processed_count, 
    'stake_deducted', v_stake
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
