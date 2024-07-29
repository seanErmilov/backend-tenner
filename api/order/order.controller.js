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

		// Give the user credit for adding a order
		// var user = await userService.getById(order.byUserId)
		// user.score += 10

		// loggedinUser.score += 10
		// await userService.update(loggedinUser)

		// Update user score in login token as well

		// const loginToken = authService.getLoginToken(loggedinUser)
		// res.cookie('loginToken', loginToken)

		// prepare the updated order for sending out


		// order.byUser = loggedinUser
		// order.aboutUser = await userService.getById(aboutUserId)

		// delete order.aboutUser.givenOrders
		// delete order.aboutUserId
		// delete order.byUserId

		// socketService.broadcast({ type: 'order-added', data: order, userId: loggedinUser._id })
		// socketService.emitToUser({ type: 'order-about-you', data: order, userId: order.aboutUser._id })

		// const fullUser = await userService.getById(loggedinUser._id)
		// socketService.emitTo({ type: 'user-updated', data: fullUser, label: fullUser._id })
		res.send(order)
	} catch (err) {
		logger.error('Failed to add order', err)
		res.status(400).send({ err: 'Failed to add order' })
	}
}
