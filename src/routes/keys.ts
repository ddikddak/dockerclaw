import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { authenticateUser } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Prefix per les API keys
const KEY_PREFIX = 'dk_';

/**
 * Genera una nova API key segura
 * Format: dk_<32 caràcters hexadecimals>
 * Retorna: { fullKey, keyHash, keyPrefix }
 */
function generateApiKey(): { fullKey: string; keyHash: string; keyPrefix: string } {
  // Generar 32 bytes aleatoris i convertir a hex (64 caràcters)
  const randomPart = crypto.randomBytes(32).toString('hex');
  const fullKey = `${KEY_PREFIX}${randomPart}`;
  
  // Crear hash de la key per guardar a la BD (SHA-256)
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
  
  // Prefix per identificar visualment (primeres 8 caràcters després del prefix)
  const keyPrefix = `${KEY_PREFIX}${randomPart.substring(0, 8)}`;
  
  return { fullKey, keyHash, keyPrefix };
}

/**
 * POST /api/keys
 * Crea una nova API key
 * Retorna la key completa NOMÉS AQUESTA VEGADA
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Name is required for the API key' });
      return;
    }
    
    const { fullKey, keyHash, keyPrefix } = generateApiKey();
    
    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        keyHash,
        keyPrefix,
        isActive: true,
      },
    });
    
    // Retornar la key completa NOMÉS AQUESTA VEGADA
    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      fullKey, // ⚠️ Només es mostra aquesta vegada!
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * GET /api/keys
 * Llista totes les API keys (sense mostrar la key completa)
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
    
    res.json({ keys: apiKeys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

/**
 * DELETE /api/keys/:id
 * Revoca una API key (soft delete - marca com a inactiva)
 */
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const id = String(req.params.id);
    
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { id },
    });
    
    if (!apiKeyRecord) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }
    
    if (!apiKeyRecord.isActive) {
      res.status(400).json({ error: 'API key is already revoked' });
      return;
    }
    
    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });
    
    res.json({ 
      success: true, 
      message: 'API key revoked successfully',
      id: apiKeyRecord.id,
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * POST /api/keys/bootstrap
 * Crea la PRIMERA API key sense autenticació (només si no n'hi ha cap)
 * Això permet a l'usuari inicial configurar la seva primera key
 */
router.post('/bootstrap', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Name is required for the API key' });
      return;
    }
    
    // Comprovar si ja existeix alguna key activa
    const existingKeys = await prisma.apiKey.count({
      where: { isActive: true },
    });
    
    // Si ja hi ha keys, requerir autenticació
    if (existingKeys > 0) {
      res.status(403).json({ 
        error: 'Bootstrap not allowed. API keys already exist. Use authenticated endpoint.',
        keysExist: true,
      });
      return;
    }
    
    const { fullKey, keyHash, keyPrefix } = generateApiKey();
    
    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        keyHash,
        keyPrefix,
        isActive: true,
      },
    });
    
    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      fullKey, // ⚠️ Només es mostra aquesta vegada!
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
      message: 'First API key created successfully. Save this key - you will not see it again!',
    });
  } catch (error) {
    console.error('Error creating bootstrap API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});
 * Valida una API key (per usar des del frontend)
 */
router.post('/validate', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey || typeof apiKey !== 'string') {
      res.status(400).json({ error: 'API key is required' });
      return;
    }
    
    // Calcular el hash de la key proporcionada
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const storedKey = await prisma.apiKey.findUnique({
      where: { keyHash },
    });
    
    if (!storedKey || !storedKey.isActive) {
      res.status(401).json({ valid: false, error: 'Invalid or revoked API key' });
      return;
    }
    
    // Actualitzar lastUsedAt
    await prisma.apiKey.update({
      where: { id: storedKey.id },
      data: { lastUsedAt: new Date() },
    });
    
    res.json({ 
      valid: true, 
      name: storedKey.name,
      keyPrefix: storedKey.keyPrefix,
    });
  } catch (error) {
    console.error('Error validating API key:', error);
    res.status(500).json({ valid: false, error: 'Failed to validate API key' });
  }
});

export default router;
