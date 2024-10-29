import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import { addMessage, getMessages, deleteMessage, getMessageById, updateMessage } from './message.controller.js'

const router = express.Router()

router.get('/', log, requireAuth, getMessages)
router.get('/:id', requireAuth, log, getMessageById)
router.post('/', log, requireAuth, addMessage)
router.put('/:id', requireAuth, updateMessage)
router.delete('/:id', requireAuth, deleteMessage)

export const messageRoutes = router