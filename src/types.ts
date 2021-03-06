import Express from 'express';
import Knex from 'knex';

export interface LatLon {
  lat: number
  lon: number
}

export interface User {
  id: number
  isAdmin: boolean
}

export interface Session {
  id: string
  destroy(callback: (err: any) => void): void;
}

export interface PostGraphileContext {
  ip: string
  user?: User
  sessionId?: string
  knex: Knex
  req: Express.Request
}

export interface IdParam {
  id: number
}

declare module 'http' {
  export interface IncomingMessage {
    user?: User
    session: Session
    ip: string // from Express.Request
  }
}
