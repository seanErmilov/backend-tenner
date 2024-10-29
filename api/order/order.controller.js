import { logger } from '../../services/logger.service.js'
import { socketService } from '../../services/socket.service.js'
import { userService } from '../user/user.service.js'
import { authService } from '../auth/auth.service.js'
import { orderService } from './order.service.js'

export async function getOrders(req, res) {
	try {
		const orders = await orderService.query(req.query)
		res.send(orders)
	} catch (err) {
		logger.error('Cannot get orders', err)
		res.status(400).send({ err: 'Failed to get orders' })
	}
}

export async function getOrderById(req, res) {
	try {
		const orderId = req.params.id
		const order = await orderService.getById(orderId)
		res.json(order)
	} catch (err) {
		logger.error('Failed to get order', err)
		res.status(400).send({ err: 'Failed to get order' })
	}
}

export async function updateOrder(req, res) {
	const { loggedinUser, body: order } = req
	const { _id: userId } = loggedinUser

	if (order.seller._id !== userId) {
		res.status(403).send('Not your order...')
		return
	}
	try {
		const updatedOrder = await orderService.update(order)
		console.log('order.buyer._id :', order.buyer._id)
		socketService.emitToUser({ type: 'order-status-updated', data: order, userId: order.buyer._id })

		res.json(updatedOrder)
	} catch (err) {
		logger.error('Failed to update order', err)
		res.status(400).send({ err: 'Failed to update order' })
	}
}

export async function deleteOrder(req, res) {
	var { loggedinUser } = req
	const { id: orderId } = req.params

	try {
		const deletedCount = await orderService.remove(orderId)
		if (deletedCount === 1) {
			socketService.broadcast({ type: 'order-removed', data: orderId, userId: loggedinUser._id })
			res.send({ msg: 'Deleted successfully' })
		} else {
			res.status(400).send({ err: 'Cannot remove order' })
		}
	} catch (err) {
		logger.error('Failed to delete order', err)
		res.status(400).send({ err: 'Failed to delete order' })
	}
}

export async function addOrder(req, res) {
	var { loggedinUser } = req

	try {
		var order = req.body
		const { aboutUserId } = order
		console.log('loggedinUser :', loggedinUser)
		order.buyer = { ...loggedinUser }
		order = await orderService.add(order)

		socketService.emitToUser({ type: 'order-added', data: order, userId: order.seller._id })
		socketService.emitToUser({ type: 'order-about-you', data: order, userId: order.seller._id })
		res.send(order)
	} catch (err) {
		logger.error('Failed to add order', err)
		res.status(400).send({ err: 'Failed to add order' })
	}
}
