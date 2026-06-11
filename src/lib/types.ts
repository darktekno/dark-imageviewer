export interface User {
  id: string;
  username: string;
  created_at: string;
}

export interface Session {
  id: string;
  username: string;
  created_at: string;
}

export interface Folder {
  id: string;
  username: string;
  name: string;
  image_count: number;
  created_at: string;
}

export interface Image {
  id: string;
  folder_id: string;
  filename: string;
  stored_path: string;
  size: number;
  created_at: string;
}
