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
        console.log('message :', message);

        const messageToAdd = {
            sender: {
                _id: message.sender._id,
                imgUrl: message.sender.imgUrl,
                fullname: message.sender.fullname
            },
            recipient: {
                _id: message.recipient._id,
                imgUrl: message.recipient.imgUrl,
                fullname: message.recipient.fullname
            },
            content: message.content,
            messageType: message.messageType || '',
            attachments: message.attachments || []
        };

        const collection = await dbService.getCollection('message');
        await collection.insertOne(messageToAdd);

        return messageToAdd;
    } catch (err) {
        logger.error('cannot add message', err);
        throw err;
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
    if (filterBy._userId && filterBy.chatPartnerId) {
        criteria['$or'] = [
            { 'sender._id': filterBy._userId, 'recipient._id': filterBy.chatPartnerId },
            { 'sender._id': filterBy.chatPartnerId, 'recipient._id': filterBy._userId }
        ]
    }
    return criteria
}

