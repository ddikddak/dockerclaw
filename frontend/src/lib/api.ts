const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const api = {
  // Boards
  getBoards: () => fetch(`${API_URL}/api/boards`).then(r => r.json()),
  
  createBoard: (data: { name: string; description?: string }) =>
    fetch(`${API_URL}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  
  getBoard: (id: string) => fetch(`${API_URL}/api/boards/${id}`).then(r => r.json()),
  
  // Documents
  getDocuments: (boardId: string) =>
    fetch(`${API_URL}/api/boards/${boardId}/documents`).then(r => r.json()),
  
  getDocument: (boardId: string, docId: string) =>
    fetch(`${API_URL}/api/boards/${boardId}/documents/${docId}`).then(r => r.json()),
}
