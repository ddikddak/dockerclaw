import { prisma } from './prisma'

export async function authenticateBoard(apiKey: string) {
  const board = await prisma.board.findUnique({
    where: { api_key: apiKey }
  })
  return board
}
