export interface Block {
  id: string;
  content: string;
  type: 'text';
}

export interface EditorState {
  title: string;
  blocks: Block[];
}
