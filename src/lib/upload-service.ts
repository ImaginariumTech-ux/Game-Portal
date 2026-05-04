import { supabase } from './supabase/client';

export interface GameMetadata {
    title: string;
    description: string;
    version: string;
    author: string;
    collection: string;
    coverImage?: File | null;
    gameImage?: File | null;
    gameUrl: string; // New field
}

export async function uploadGame(
    metadata: GameMetadata,
    onProgress: (progress: number) => void
): Promise<{ success: boolean; error?: string; slug?: string }> {
    try {
        onProgress(10); // Start progress

        // 1. Generate Slug
        const slug = metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // 2. Upload Images
        let coverImageUrl = null;
        let gameImageUrl = null;

        const uploadImage = async (image: File, path: string) => {
            const fileExt = image.name.split('.').pop();
            const fileName = `${path}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('game-images')
                .upload(fileName, image, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('game-images')
                .getPublicUrl(fileName);

            return data.publicUrl;
        };

        if (metadata.coverImage) {
            coverImageUrl = await uploadImage(metadata.coverImage, `${slug}/cover-${Date.now()}`);
        }
        onProgress(30);

        if (metadata.gameImage) {
            gameImageUrl = await uploadImage(metadata.gameImage, `${slug}/game-${Date.now()}`);
        }
        onProgress(60);

        // 3. Create DB Record
        const { error: dbError } = await supabase
            .from('games')
            .insert({
                title: metadata.title,
                slug: slug,
                description: metadata.description,
                version: metadata.version,
                status: 'published', // Automatically publish since it's an external URL
                thumbnail_url: coverImageUrl,
                game_image_url: gameImageUrl,
                game_url: metadata.gameUrl, // Save external URL
                // author_id: user?.id // Uncomment when auth is live
            });

        if (dbError) {
            return { success: false, error: dbError.message };
        }

        onProgress(100);
        return { success: true, slug };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
