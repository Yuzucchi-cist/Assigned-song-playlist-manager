export type Song = {
    name: string;
    name_and_artist: string; // name and artist are in no particular order.
    youtube_video_id: string | undefined;
};

export type UnfoundSongs = Song[];
