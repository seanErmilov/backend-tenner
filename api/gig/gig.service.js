import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

export const gigService = {
	remove,
	query,
	getById,
	add,
	update,
	addGigMsg,
	removeGigMsg,
}

async function query(filterBy) {
	try {
		const criteria = _buildCriteria(filterBy)
		const sort = _buildSort(filterBy)

		const collection = await dbService.getCollection('gig')
		var gigCursor = await collection.find(criteria, { sort })

		if (filterBy.pageIdx !== undefined) {
			gigCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
		}
		const gigs = gigCursor.toArray()
		return gigs
	} catch (err) {
		logger.error('cannot find gigs', err)
		throw err
	}
}

async function getById(gigId) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(gigId) }

		const collection = await dbService.getCollection('gig')
		const gig = await collection.findOne(criteria)

		gig.createdAt = gig._id.getTimestamp()
		return gig
	} catch (err) {
		logger.error(`while finding gig ${gigId}`, err)
		throw err
	}
}

async function remove(gigId) {
	const { loggedinUser } = asyncLocalStorage.getStore()
	const { _id: ownerId, isAdmin } = loggedinUser

	try {
		const criteria = {
			_id: ObjectId.createFromHexString(gigId),
		}
		if (!isAdmin) criteria['owner._id'] = ownerId

		const collection = await dbService.getCollection('gig')
		const res = await collection.deleteOne(criteria)

		if (res.deletedCount === 0) throw ('Not your gig')
		return gigId
	} catch (err) {
		logger.error(`cannot remove gig ${gigId}`, err)
		throw err
	}
}

async function add(gig) {
	try {
		const collection = await dbService.getCollection('gig')
		await collection.insertOne(gig)

		return gig
	} catch (err) {
		logger.error('cannot insert gig', err)
		throw err
	}
}

async function update(gig) {
	const gigToSave = { title: gig.title, speed: gig.speed }

	try {
		const criteria = { _id: ObjectId.createFromHexString(gig._id) }

		const collection = await dbService.getCollection('gig')
		await collection.updateOne(criteria, { $set: gigToSave })

		return gig
	} catch (err) {
		logger.error(`cannot update gig ${gig._id}`, err)
		throw err
	}
}

async function addGigMsg(gigId, msg) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(gigId) }
		msg.id = makeId()

		const collection = await dbService.getCollection('gig')
		await collection.updateOne(criteria, { $push: { msgs: msg } })

		return msg
	} catch (err) {
		logger.error(`cannot add gig msg ${gigId}`, err)
		throw err
	}
}

async function removeGigMsg(gigId, msgId) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(gigId) }

		const collection = await dbService.getCollection('gig')
		await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

		return msgId
	} catch (err) {
		logger.error(`cannot add gig msg ${gigId}`, err)
		throw err
	}
}

function _buildCriteria(filterBy) {
	const criteria = {}

	if (filterBy.title) {
		criteria.title = { $regex: filterBy.title, $options: 'i' }
	}

	if (filterBy.descrption) {
		criteria.descrption = { $regex: filterBy.descrption, $options: 'i' }
	}

	if (filterBy.price !== undefined && filterBy.price !== null) {
		criteria.price = { $lte: filterBy.price }
	}

	if (filterBy.daysToMake !== undefined && filterBy.daysToMake !== null) {
		console.log('filterBy.daysToMake :', filterBy.daysToMake)
		criteria.daysToMake = { $lte: filterBy.daysToMake }
	}

	if (filterBy.tags && filterBy.tags.length > 0) {
		criteria.tags = { $in: filterBy.tags }
	}

	return criteria
}

function _buildSort(filterBy) {
	if (!filterBy.sortField) return {}
	return { [filterBy.sortField]: filterBy.sortDir }
}