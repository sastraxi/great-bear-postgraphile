import Knex from 'knex';

export interface User {
  id: number,
  isAdmin: boolean,
}

export interface Session {
  id: string,
}

export interface PostGraphileContext {
  ip: string,
  user?: User,
  sessionId?: string,
  knex: Knex,
}

export interface IdParam {
  id: number
}

declare module 'http' {
  export interface IncomingMessage {
    user?: User,
    session: Session,
    ip: string, // from Express.Request
  }
}
