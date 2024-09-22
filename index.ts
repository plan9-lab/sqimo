/**
 * Sqimo (Eskimo) is a database wrapper.
 * Currently it supports only sqlite. Support for mongo and postgres is planned.
 */
import { Database } from 'bun:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { monotonicFactory } from 'ulid'

export const info = (message: string) => {
	console.info(`\u001b[2m[SQIMO] ${message}\u001b[22m`)
}

/**
 * Generates lexicaly sortable safe uniq ids.
 */
export const createUid = () => {
	const ulid = monotonicFactory()
	return ulid()
}

export const jsonToSql = (query: any) => {
	let sql = ' _id'
	for (const key in query) {
		const value = query[key]
		if (key.startsWith('!')) {
			sql += ` AND ${key.slice(1)} != '${value}'`
		} else {
			sql += ` AND ${key} = '${value}'`
		}
	}
	return sql
}

export interface SqimoFiled {
	name: string
	type?: string
	unique?: boolean
	index?: boolean
	not_null?: boolean
	default?: string
}

export interface SqimoOptions {
	// For sqlite this is path to file. 
	// Later when we add mongo or postgres this will be connection string.
	connection_string?: string
}

export class Sqimo {
	options: SqimoOptions
	db: Database

	constructor(options: SqimoOptions) {
		this.options = options
		if (options.connection_string) {
			const db_path = path.join(options.connection_string)
			this.db = new Database(db_path)
			info(db_path)
		} else {
			info('in memory') 
			this.db = new Database(':memory:')
		}
	}

	/**
	 * Sends direct query to database.
	 */
	async query(query: string) {
		return this
			.db
			.query(query)
	}

	/**
	 * Creates collection.
	 */
	async createCollection(name: string, fields: SqimoFiled[] = []) {
		this.db.exec(
			`CREATE TABLE IF NOT EXISTS ${name} (_id text PRIMARY KEY)`
		)
		for (const field of fields) {
			this.addField(name, field)
		}
	}

	/**
	 * Shows collections.
	 */
	async showCollections() {
		return this
			.db
			.query(
				'SELECT * FROM sqlite_master WHERE type="table"'
			)
			.all()
	}

	/**
	 * ensureIndex создает индекс на указаных в массиве полях
	 */
	async ensureIndex(collection: string, fields: string[]) {
		const index_name = `${collection}_${fields.join('_')}_index`
		const sql = `CREATE INDEX IF NOT EXISTS ${index_name} ON ${collection} (${fields.join(', ')})`
		this.db.exec(sql)
	}

	/** 
	 * Добавляет поле в коллекцию если его не существует 
	 */
	async addField(collection: string, field: SqimoFiled) {
		let sql = `ALTER TABLE ${collection} ADD COLUMN ${field.name} ${field.type}`

		if (field.unique) {
			sql += ' UNIQUE'
		}
		if (field.not_null) {
			sql += ' NOT NULL'
		} 
		if (field.default) {
			sql += ` DEFAULT ${field.default}`
		}
		this.db.exec(sql)

		if (field.index) {
			this.ensureIndex(collection, [field.name])
		}
	} 

	/**
	 * Shows fields from collection.
	 */
	async showFields(collection: string) {
		return this.db.query(
			`PRAGMA table_info(${collection})`
		).all()
	}

	/**
	 * Shows indexes from collection.
	 */
	async showIndexes(collection: string) {
		return this.db.query(
			`PRAGMA index_list(${collection})`
		).all()
	}

	/**
	 * Finds in collection by query.
	 * Query is a mongo-like query.
	 * Options is a mongo-like options.
	 */
	async find(collection: string, query: any = {}, options: any = {}) {
		let sql = `SELECT * FROM ${collection}`

		if (query) {
			sql += ` WHERE ${jsonToSql(query)}`
		}

		return this
			.db
			.query(sql)
			.all()
	}

	/**
	 * Inserts data into collection.
	 */
	async insert(collection_name: string, data: any = {}) {

		const doc = { ...data }

		if (!doc._id) {
			doc._id = createUid()
		}
	
		const fields = Object.keys(doc).join(', ')
		const placeholders = Object
			.keys(doc).map(() => '?')
			.join(', ')
		const values: any = Object.values(doc)
			.map(value => {
				if (typeof value === 'object') {
					return JSON.stringify(value)
				}
				return value
			})
		
		const sql = `
			INSERT INTO ${collection_name} (${fields}) 
			VALUES (${placeholders})
		`
	
		try {
			const statement = this.db.prepare(sql)
			statement.run(values)
			statement.finalize()
			return {
				_id: doc._id,
				...doc
			}
		} catch (error: any) {
			console.log(error)
			throw new Error(error)
		}
	}

}