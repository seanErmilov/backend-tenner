import { ObjectId } from 'mongodb'

import { asyncLocalStorage } from '../../services/als.service.js'
import { logger } from '../../services/logger.service.js'
import { dbService } from '../../services/db.service.js'

export const orderService = { query, remove, add, getById, update }

async function query(filterBy = {}) {
    try {
        const criteria = _buildCriteria(filterBy)
        const collection = await dbService.getCollection('order')

        const orders = await collection.find(criteria).toArray()

        return orders
    } catch (err) {
        logger.error('cannot get orders', err)
        throw err
    }
}

async function getById(orderId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(orderId) }

        const collection = await dbService.getCollection('order')
        const order = await collection.findOne(criteria)

        order.createdAt = order._id.getTimestamp()
        return order
    } catch (err) {
        logger.error(`while finding order ${orderId}`, err)
        throw err
    }
}

async function remove(orderId) {
    try {
        const { loggedinUser } = asyncLocalStorage.getStore()
        const collection = await dbService.getCollection('order')

        const criteria = { _id: ObjectId.createFromHexString(orderId) }

        // remove only if user is owner/admin
        if (!loggedinUser.isAdmin) {
            criteria.byUserId = ObjectId.createFromHexString(loggedinUser._id)
        }

        const { deletedCount } = await collection.deleteOne(criteria)
        return deletedCount
    } catch (err) {
        logger.error(`cannot remove order ${orderId}`, err)
        throw err
    }
}

async function add(order) {
    try {
        const orderToAdd = {
            seller: {
                _id: ObjectId.createFromHexString(order.seller._id),
                imgUrl: order.seller.imgUrl,
                fullName: order.seller.fullname,
            },
            gig: {
                _id: ObjectId.createFromHexString(order.gig._id),
                name: order.gig.name,
                imgUrl: order.gig.imgUrl,
                price: order.gig.price,
            },
            buyer: {
                _id: ObjectId.createFromHexString(order.buyer._id),
                imgUrl: order.buyer.imgUrl,
                fullName: order.buyer.fullname,
            },
            status: order.status,
        }
        const collection = await dbService.getCollection('order')
        await collection.insertOne(orderToAdd)

        return orderToAdd
    } catch (err) {
        logger.error('cannot add order', err)
        throw err
    }
}

async function update(order) {
    const { _id, ...orderToSave } = order
    try {
        const criteria = { _id: ObjectId.createFromHexString(order._id) }
        const collection = await dbService.getCollection('order')

        orderToSave.seller._id = ObjectId.createFromHexString(order.seller._id)
        orderToSave.buyer._id = ObjectId.createFromHexString(order.buyer._id)
        orderToSave.gig._id = ObjectId.createFromHexString(order.gig._id)

        await collection.updateOne(criteria, { $set: orderToSave })

        return order
    } catch (err) {
        logger.error(`cannot update order ${order._id}`, err)
        throw err
    }
}

function _buildCriteria(filterBy) {
    const criteria = {}

    if (filterBy._userId) {
        criteria['seller._id'] = ObjectId.createFromHexString(filterBy._userId)
    }
    return criteria
}