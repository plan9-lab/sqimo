import { it, expect } from 'bun:test'
import { Sqimo } from '@/index'

const sqimo = new Sqimo({})
const collection_name1 = 'users'

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
