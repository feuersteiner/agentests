import type { Org, Project, PublicKey, Session, User } from './models.ts';

interface Row {
	id: string;
	createdAt: string;
}

type OrderBy<T> = { [K in keyof T]?: 'asc' | 'desc' };

/** Drops the fields whose value is undefined, as Prisma does, so they keep their stored value. */
function defined<T extends object>(data: T): Partial<T> {
	return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<T>;
}

/**
 * One in-memory table with the part of Prisma's client API this service uses, so the routes read
 * the same as they will once the tables move to Postgres.
 */
export class Table<T extends Row> {
	private rows = new Map<string, T>();
	private count = 0;

	constructor(private readonly prefix: string) {}

	async findUnique({ where }: { where: { id: string } }): Promise<T | null> {
		const row = this.rows.get(where.id);
		return row ? structuredClone(row) : null;
	}

	async findMany({ where = {}, orderBy }: { where?: Partial<T>; orderBy?: OrderBy<T> } = {}): Promise<T[]> {
		const wanted = Object.entries(defined(where));
		const rows = [...this.rows.values()].filter((row) =>
			wanted.every(([field, value]) => row[field as keyof T] === value)
		);
		const [field, direction] = Object.entries(orderBy ?? {})[0] ?? [];
		if (field) {
			const sign = direction === 'desc' ? -1 : 1;
			rows.sort((a, b) => {
				const x = a[field as keyof T];
				const y = b[field as keyof T];
				return x < y ? -sign : x > y ? sign : 0;
			});
		}
		return rows.map((row) => structuredClone(row));
	}

	async create({ data }: { data: Omit<T, 'id' | 'createdAt'> & Partial<Row> }): Promise<T> {
		this.count += 1;
		const row = {
			id: `${this.prefix}_${this.count}`,
			createdAt: new Date().toISOString(),
			...defined(data)
		} as T;
		this.rows.set(row.id, row);
		return structuredClone(row);
	}

	async update({ where, data }: { where: { id: string }; data: Partial<T> }): Promise<T> {
		const row = this.rows.get(where.id);
		if (!row) throw new Error(`No ${this.prefix} row with id ${where.id}`);
		Object.assign(row, defined(data));
		return structuredClone(row);
	}

	async delete({ where }: { where: { id: string } }): Promise<T> {
		const row = this.rows.get(where.id);
		if (!row) throw new Error(`No ${this.prefix} row with id ${where.id}`);
		this.rows.delete(where.id);
		return row;
	}

	/** Replaces every row; used by the seed. */
	reset(rows: T[]): void {
		this.rows = new Map(rows.map((row) => [row.id, structuredClone(row)]));
		this.count = rows.length;
	}
}

export const db = {
	org: new Table<Org>('org'),
	user: new Table<User>('usr'),
	publicKey: new Table<PublicKey>('key'),
	project: new Table<Project>('prj'),
	session: new Table<Session>('ses')
};
