import { it, expect } from 'bun:test'
import { Sqimo } from '@/index'
import { join } from 'node:path'

const sqimo = new Sqimo({
	//connection_string: 'test.db'
})

const collection_name1 = 'users'

it('create database dir', async (done) => {
	const db_path = join(__dirname, '.data', 'test.db')
	new Sqimo({
		connection_string: db_path
	})
	expect(db_path).toBeString()
	done()
})

it('create collection', async (done) => {
	const columns = [
		{
			name: 'name',
		}
	]
	await sqimo.createCollection(collection_name1, columns)
	const collections = await sqimo.showCollections()
	const collection = collections.find(
		(collection: any) => collection.name === collection_name1
	)

	expect(collection).not.toBeUndefined()

	done()
})

it('insert', async (done) => {
	const doc = await sqimo.insert(collection_name1, { name: 'Bill' })
	expect(doc.name).toBe('Bill')
	expect(doc._id).toBeString()
	done()
})

it('find', async (done) => {
	const docs: any = await sqimo.find(collection_name1, { name: 'Bill' })
	expect(docs[0].name).toBe('Bill')
	done()
})
