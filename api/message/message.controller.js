import { logger } from '../../services/logger.service.js'
import { socketService } from '../../services/socket.service.js'
import { userService } from '../user/user.service.js'
import { authService } from '../auth/auth.service.js'
import { messageservice } from './message.service.js'

export async function getMessages(req, res) {
	try {
		const filterBy = {
			_userId: req.loggedinUser._id
		}
		const messages = await messageservice.query(filterBy)
		res.send(messages)
	} catch (err) {
		logger.error('Cannot get messages', err)
		res.status(400).send({ err: 'Failed to get messages' })
	}
}

export async function getMessageById(req, res) {
	try {
		const messageId = req.params.id
		const message = await messageservice.getById(messageId)
		res.json(message)
	} catch (err) {
		logger.error('Failed to get message', err)
		res.status(400).send({ err: 'Failed to get message' })
	}
}

export async function updateMessage(req, res) {
	const { loggedinUser, body: message } = req
	const { _id: userId } = loggedinUser

	if (message.seller._id !== userId) {
		res.status(403).send('Not your message...')
		return
	}
	try {
		const updatedMessage = await messageservice.update(message)
		socketService.emitToUser({ type: 'message-status-updated', data: message, userId: message.buyer._id })

		res.json(updatedMessage)
	} catch (err) {
		logger.error('Failed to update message', err)
		res.status(400).send({ err: 'Failed to update message' })
	}
}

export async function deleteMessage(req, res) {
	var { loggedinUser } = req
	const { id: messageId } = req.params

	try {
		const deletedCount = await messageservice.remove(messageId)
		if (deletedCount === 1) {
			socketService.broadcast({ type: 'message-removed', data: messageId, userId: loggedinUser._id })
			res.send({ msg: 'Deleted successfully' })
		} else {
			res.status(400).send({ err: 'Cannot remove message' })
		}
	} catch (err) {
		logger.error('Failed to delete message', err)
		res.status(400).send({ err: 'Failed to delete message' })
	}
}

export async function addMessage(req, res) {
	var { loggedinUser } = req

	try {
		var message = req.body
		if (message.senderId !== loggedinUser._id) throw "User"
		message.senderId = loggedinUser._id
		message = await messageservice.add(message)

		// socketService.emitToUser({ type: 'message-added', data: message, userId: message.seller._id })
		// socketService.emitToUser({ type: 'message-about-you', data: message, userId: message.seller._id })
		res.send(message)
	} catch (err) {
		logger.error('Failed to add message', err)
		res.status(400).send({ err: 'Failed to add message' })
	}
}
