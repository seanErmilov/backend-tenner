import { ObjectId } from 'mongodb'

import { asyncLocalStorage } from '../../services/als.service.js'
import { logger } from '../../services/logger.service.js'
import { dbService } from '../../services/db.service.js'

export const messageservice = { query, remove, add, getById, update }

async function query(filterBy = {}) {
    try {
        const criteria = _buildCriteria(filterBy)
        const collection = await dbService.getCollection('message')
        const messages = await collection.find(criteria).sort({ "_id": -1 }).toArray()
        return messages
    } catch (err) {
        logger.error('cannot get messages', err)
        throw err
    }
}

async function getById(messageId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(messageId) }

        const collection = await dbService.getCollection('message')
        const message = await collection.findOne(criteria)

        message.createdAt = message._id.getTimestamp()
        return message
    } catch (err) {
        logger.error(`while finding message ${messageId}`, err)
        throw err
    }
}

async function remove(messageId) {
    try {
        const { loggedinUser } = asyncLocalStorage.getStore()
        const collection = await dbService.getCollection('message')

        const criteria = { _id: ObjectId.createFromHexString(messageId) }

        // remove only if user is owner/admin
        if (!loggedinUser.isAdmin) {
            criteria.byUserId = ObjectId.createFromHexString(loggedinUser._id)
        }

        const { deletedCount } = await collection.deleteOne(criteria)
        return deletedCount
    } catch (err) {
        logger.error(`cannot remove message ${messageId}`, err)
        throw err
    }
}

async function add(message) {
    try {
        const messageToAdd = {
            seller: {
                _id: ObjectId.createFromHexString(message.seller._id),
                imgUrl: message.seller.imgUrl,
                fullName: message.seller.fullname,
            },
            gig: {
                _id: ObjectId.createFromHexString(message.gig._id),
                name: message.gig.name,
                imgUrl: message.gig.imgUrl,
                price: message.gig.price,
            },
            buyer: {
                _id: ObjectId.createFromHexString(message.buyer._id),
                imgUrl: message.buyer.imgUrl,
                fullName: message.buyer.fullname,
            },
            status: message.status,
        }
        const collection = await dbService.getCollection('message')
        await collection.insertOne(messageToAdd)

        return messageToAdd
    } catch (err) {
        logger.error('cannot add message', err)
        throw err
    }
}

async function update(message) {
    const { _id, ...messageToSave } = message
    try {
        const criteria = { _id: ObjectId.createFromHexString(message._id) }
        const collection = await dbService.getCollection('message')

        messageToSave.seller._id = ObjectId.createFromHexString(message.seller._id)
        messageToSave.buyer._id = ObjectId.createFromHexString(message.buyer._id)
        messageToSave.gig._id = ObjectId.createFromHexString(message.gig._id)

        await collection.updateOne(criteria, { $set: messageToSave })

        return message
    } catch (err) {
        logger.error(`cannot update message ${message._id}`, err)
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