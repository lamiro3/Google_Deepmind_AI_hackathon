import Database from "better-sqlite3";
import path from "path";
import { KPOP_ARTISTS, Track, UserProfile } from "@/types/komposer";
import { SEED_TRACKS } from "./seedData";

const DB_PATH = path.join(process.cwd(), "komposer.db");

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      handle TEXT NOT NULL,
      bio TEXT NOT NULL,
      avatar_color TEXT NOT NULL,
      favorite_artists TEXT NOT NULL,
      favorite_genres TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      english_title TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      creator_handle TEXT NOT NULL,
      artists TEXT NOT NULL,
      artist_names TEXT NOT NULL,
      is_collab INTEGER NOT NULL,
      collab_ratio INTEGER NOT NULL,
      youtube_refs TEXT NOT NULL,
      genre TEXT NOT NULL,
      tags TEXT NOT NULL,
      mood TEXT NOT NULL,
      bpm INTEGER NOT NULL,
      musical_key TEXT NOT NULL,
      duration INTEGER NOT NULL,
      style_analysis TEXT NOT NULL,
      collab_point TEXT NOT NULL,
      cover_config TEXT NOT NULL,
      musical_dna TEXT NOT NULL,
      lyrics TEXT NOT NULL,
      plays INTEGER NOT NULL DEFAULT 0,
      likes_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_likes (
      user_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, track_id)
    );
  `);

  // Seed default users if empty
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password, name, handle, bio, avatar_color, favorite_artists, favorite_genres, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      "user-demo-1",
      "producer@komposer.kr",
      "komposer123",
      "PRODUCER K",
      "@producer_k",
      "좋아하는 아티스트들의 세계관을 믹스해 세상에 없던 K-POP 콜라보 트랙을 만듭니다.",
      "#8b5cf6",
      JSON.stringify(["newjeans", "aespa", "day6", "seventeen"]),
      JSON.stringify(["Y2K / UK Garage", "Hyperpop / Metallic", "K-Band / Youth Rock"]),
      "2026-10-15T10:00:00Z"
    );

    insertUser.run(
      "user-demo-2",
      "youth@komposer.kr",
      "komposer123",
      "청춘사운드",
      "@youth_sound",
      "밴드 사운드와 감성 보컬의 만남을 연구하는 방구석 K-POP 작곡가",
      "#10b981",
      JSON.stringify(["day6", "iu", "bts"]),
      JSON.stringify(["K-Band / Youth Rock", "R&B / Emotional Ballad"]),
      "2026-10-15T11:00:00Z"
    );
  }

  // Seed tracks if empty
  const trackCount = db.prepare("SELECT COUNT(*) as count FROM tracks").get() as { count: number };
  if (trackCount.count === 0) {
    const insertTrack = db.prepare(`
      INSERT INTO tracks (
        id, title, english_title, creator_id, creator_name, creator_handle,
        artists, artist_names, is_collab, collab_ratio, youtube_refs,
        genre, tags, mood, bpm, musical_key, duration,
        style_analysis, collab_point, cover_config, musical_dna, lyrics,
        plays, likes_count, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `);

    const insertLike = db.prepare(`
      INSERT OR IGNORE INTO user_likes (user_id, track_id, created_at)
      VALUES (?, ?, ?)
    `);

    const seedTx = db.transaction(() => {
      for (const t of SEED_TRACKS) {
        insertTrack.run(
          t.id,
          t.title,
          t.englishTitle,
          t.creatorId,
          t.creatorName,
          t.creatorHandle,
          JSON.stringify(t.artists),
          JSON.stringify(t.artistNames),
          t.isCollab ? 1 : 0,
          t.collabRatio,
          JSON.stringify(t.youtubeRefs),
          t.genre,
          JSON.stringify(t.tags),
          t.mood,
          t.bpm,
          t.musicalKey,
          t.duration,
          t.styleAnalysis,
          t.collabPoint,
          JSON.stringify(t.coverConfig),
          JSON.stringify(t.musicalDna),
          JSON.stringify(t.lyrics),
          t.plays,
          t.likesCount,
          t.createdAt
        );
      }

      // Initial liked tracks for user-demo-1
      insertLike.run("user-demo-1", "track-collab-1", "2026-10-15T19:00:00Z");
      insertLike.run("user-demo-1", "track-collab-2", "2026-10-15T20:30:00Z");
      insertLike.run("user-demo-1", "track-collab-4", "2026-10-15T23:00:00Z");
    });

    seedTx();
  }

  dbInstance = db;
  return db;
}

interface RawTrackRow {
  id: string;
  title: string;
  english_title: string;
  creator_id: string;
  creator_name: string;
  creator_handle: string;
  artists: string;
  artist_names: string;
  is_collab: number;
  collab_ratio: number;
  youtube_refs: string;
  genre: string;
  tags: string;
  mood: string;
  bpm: number;
  musical_key: string;
  duration: number;
  style_analysis: string;
  collab_point: string;
  cover_config: string;
  musical_dna: string;
  lyrics: string;
  plays: number;
  likes_count: number;
  created_at: string;
}

interface RawUserRow {
  id: string;
  email: string;
  password?: string;
  name: string;
  handle: string;
  bio: string;
  avatar_color: string;
  favorite_artists: string;
  favorite_genres: string;
  created_at: string;
}

function mapRowToTrack(row: RawTrackRow, likedSet: Set<string>): Track {
  return {
    id: row.id,
    title: row.title,
    englishTitle: row.english_title,
    creatorId: row.creator_id,
    creatorName: row.creator_name,
    creatorHandle: row.creator_handle,
    artists: JSON.parse(row.artists),
    artistNames: JSON.parse(row.artist_names),
    isCollab: Boolean(row.is_collab),
    collabRatio: row.collab_ratio,
    youtubeRefs: JSON.parse(row.youtube_refs),
    genre: row.genre,
    tags: JSON.parse(row.tags),
    mood: row.mood,
    bpm: row.bpm,
    musicalKey: row.musical_key,
    duration: row.duration,
    styleAnalysis: row.style_analysis,
    collabPoint: row.collab_point,
    coverConfig: JSON.parse(row.cover_config),
    musicalDna: JSON.parse(row.musical_dna),
    lyrics: JSON.parse(row.lyrics),
    plays: row.plays,
    likesCount: row.likes_count,
    isLiked: likedSet.has(row.id),
    createdAt: row.created_at,
  };
}

export function mapRowToUser(row: RawUserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    handle: row.handle,
    bio: row.bio,
    avatarColor: row.avatar_color,
    favoriteArtists: JSON.parse(row.favorite_artists),
    favoriteGenres: JSON.parse(row.favorite_genres),
    createdAt: row.created_at,
  };
}

export function getUserById(userId: string): UserProfile {
  const db = getDb();
  let row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as RawUserRow | undefined;
  if (!row) {
    row = db.prepare("SELECT * FROM users WHERE id = 'user-demo-1'").get() as RawUserRow;
  }
  return mapRowToUser(row);
}

export function authenticateOrRegisterUser(params: {
  mode: "login" | "register";
  email: string;
  password?: string;
  name?: string;
}): { user?: UserProfile; error?: string } {
  const db = getDb();
  const cleanEmail = params.email.trim().toLowerCase();

  if (params.mode === "login") {
    const row = db.prepare("SELECT * FROM users WHERE lower(email) = ?").get(cleanEmail) as RawUserRow | undefined;
    if (!row) {
      return { error: "등록되지 않은 이메일입니다. 회원가입 탭에서 새 작곡가 계정을 만들어 보세요!" };
    }
    return { user: mapRowToUser(row) };
  } else {
    const existing = db.prepare("SELECT * FROM users WHERE lower(email) = ?").get(cleanEmail) as RawUserRow | undefined;
    if (existing) {
      return { error: "이미 사용 중인 이메일입니다. 로그인 탭을 이용해 주세요." };
    }
    const id = `user-${Date.now()}`;
    const name = (params.name || cleanEmail.split("@")[0] || "KPOP Producer").trim();
    const handle = `@${name.toLowerCase().replace(/[^a-z0-9가-힣_]/g, "_")}`;
    const colors = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password, name, handle, bio, avatar_color, favorite_artists, favorite_genres, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanEmail,
      params.password || "komposer123",
      name,
      handle,
      `${name}의 K-POP AI 작곡 스튜디오입니다.`,
      avatarColor,
      JSON.stringify(["newjeans", "aespa"]),
      JSON.stringify(["Y2K / UK Garage", "Hyperpop / Metallic"]),
      now
    );

    return { user: getUserById(id) };
  }
}

export function updateUserPreferences(
  userId: string,
  favoriteArtists: string[],
  favoriteGenres: string[],
  name?: string,
  bio?: string
): UserProfile {
  const db = getDb();
  const current = getUserById(userId);
  db.prepare(`
    UPDATE users
    SET favorite_artists = ?,
        favorite_genres = ?,
        name = ?,
        bio = ?
    WHERE id = ?
  `).run(
    JSON.stringify(favoriteArtists),
    JSON.stringify(favoriteGenres),
    name?.trim() || current.name,
    bio?.trim() ?? current.bio,
    current.id
  );
  return getUserById(current.id);
}

export function getDashboardData(userId: string) {
  const db = getDb();
  const user = getUserById(userId);

  const likeRows = db
    .prepare("SELECT track_id FROM user_likes WHERE user_id = ?")
    .all(user.id) as { track_id: string }[];
  const likedSet = new Set(likeRows.map((r) => r.track_id));

  const allRows = db.prepare("SELECT * FROM tracks").all() as RawTrackRow[];
  const allTracks = allRows.map((r) => mapRowToTrack(r, likedSet));

  // 1. Top 10 Popular Tracks (sorted by popularity score: plays + likes * 3)
  const top10Tracks = [...allTracks]
    .sort((a, b) => b.plays + b.likesCount * 3 - (a.plays + a.likesCount * 3))
    .slice(0, 10);

  // 2. Newly Created Tracks (sorted by createdAt desc)
  const newestTracks = [...allTracks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // 3. Personalized Recommended Tracks based on user.favoriteArtists and user.favoriteGenres
  const artistNameLookup = new Map(KPOP_ARTISTS.map((a) => [a.id, a.koreanName]));
  const recommendedTracks = [...allTracks]
    .map((track) => {
      let score = 62;
      const reasons: string[] = [];

      const matchedArtists = track.artists.filter((a) => user.favoriteArtists.includes(a));
      if (matchedArtists.length >= 2) {
        const names = matchedArtists.map((id) => artistNameLookup.get(id) || id).join(" × ");
        score += 32;
        reasons.push(`최애 아티스트 (${names}) 드림 콜라보`);
      } else if (matchedArtists.length === 1) {
        const name = artistNameLookup.get(matchedArtists[0]) || matchedArtists[0];
        score += 20;
        reasons.push(`선호 아티스트 '${name}' 스타일 반영`);
      }

      if (user.favoriteGenres.includes(track.genre)) {
        score += 15;
        reasons.push(`선호 장르 (${track.genre}) 일치`);
      }

      if (track.isCollab && matchedArtists.length > 0) {
        score += 4;
      }

      if (reasons.length === 0) {
        reasons.push("플랫폼 인기 급상승 K-POP 스타일");
      }

      return {
        ...track,
        matchScore: Math.min(99, score),
        matchReasons: reasons,
      };
    })
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0) || b.plays - a.plays)
    .slice(0, 8);

  // 4. My Created Tracks
  const myTracks = newestTracks.filter((t) => t.creatorId === user.id);

  // 5. Liked Tracks
  const likedTracks = newestTracks.filter((t) => likedSet.has(t.id));

  return {
    user,
    allTracks: newestTracks,
    top10Tracks,
    newestTracks: newestTracks.slice(0, 8),
    recommendedTracks,
    myTracks,
    likedTracks,
  };
}

export function insertTrack(track: Track): Track {
  const db = getDb();
  db.prepare(`
    INSERT INTO tracks (
      id, title, english_title, creator_id, creator_name, creator_handle,
      artists, artist_names, is_collab, collab_ratio, youtube_refs,
      genre, tags, mood, bpm, musical_key, duration,
      style_analysis, collab_point, cover_config, musical_dna, lyrics,
      plays, likes_count, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `).run(
    track.id,
    track.title,
    track.englishTitle,
    track.creatorId,
    track.creatorName,
    track.creatorHandle,
    JSON.stringify(track.artists),
    JSON.stringify(track.artistNames),
    track.isCollab ? 1 : 0,
    track.collabRatio,
    JSON.stringify(track.youtubeRefs),
    track.genre,
    JSON.stringify(track.tags),
    track.mood,
    track.bpm,
    track.musicalKey,
    track.duration,
    track.styleAnalysis,
    track.collabPoint,
    JSON.stringify(track.coverConfig),
    JSON.stringify(track.musicalDna),
    JSON.stringify(track.lyrics),
    track.plays,
    track.likesCount,
    track.createdAt
  );
  return track;
}

export function toggleTrackLike(userId: string, trackId: string): { isLiked: boolean; likesCount: number } {
  const db = getDb();
  const existing = db
    .prepare("SELECT 1 FROM user_likes WHERE user_id = ? AND track_id = ?")
    .get(userId, trackId);

  const tx = db.transaction(() => {
    if (existing) {
      db.prepare("DELETE FROM user_likes WHERE user_id = ? AND track_id = ?").run(userId, trackId);
      db.prepare("UPDATE tracks SET likes_count = MAX(0, likes_count - 1) WHERE id = ?").run(trackId);
    } else {
      db.prepare("INSERT INTO user_likes (user_id, track_id, created_at) VALUES (?, ?, ?)").run(
        userId,
        trackId,
        new Date().toISOString()
      );
      db.prepare("UPDATE tracks SET likes_count = likes_count + 1 WHERE id = ?").run(trackId);
    }
    const updated = db.prepare("SELECT likes_count FROM tracks WHERE id = ?").get(trackId) as {
      likes_count: number;
    };
    return {
      isLiked: !existing,
      likesCount: updated ? updated.likes_count : 0,
    };
  });

  return tx();
}

export function incrementTrackPlay(trackId: string): number {
  const db = getDb();
  db.prepare("UPDATE tracks SET plays = plays + 1 WHERE id = ?").run(trackId);
  const row = db.prepare("SELECT plays FROM tracks WHERE id = ?").get(trackId) as { plays: number } | undefined;
  return row ? row.plays : 0;
}

