/**
 * Sqimo (Eskimo) is a database wrapper.
 * Currently it supports only sqlite. Support for mongo and postgres is planned.
 */
import { Database } from 'bun:sqlite'
import path from 'node:path'

export const cwd = __dirname

export const info = (message: string) => {
	console.info(`\u001b[2m[SQIMO] ${message}\u001b[22m`)
}


export const createUid = () => {
	const timestamp = Date.now().toString(36)
	const randomPart = Math.random().toString(36).substring(2, 8) // 6 символов
	return `${timestamp}-${randomPart}`
}


/**
 * Converts mongo-like query to sql.
 */
export const jsonToSql = (query: any) => {
	if (Object.keys(query).length === 0) {
		return ''
	}
	const sql = ' WHERE '
	const conditions = []
	for (const key in query) {
		const value = query[key]
		if (key.startsWith('!')) {
			conditions.push(`${key.slice(1)} != '${value}'`)
		} else {
			conditions.push(`${key} = '${value}'`)
		}
	}
	return sql + conditions.join(' AND ')
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
		// Check if the field already exists
		const existingFields = await this.showFields(collection)
		const fieldExists = existingFields.some(existingField => existingField.name === field.name)
	
		if (!fieldExists) {
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
			sql += jsonToSql(query)
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