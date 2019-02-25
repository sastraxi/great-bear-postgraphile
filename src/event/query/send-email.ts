import Knex from 'knex';

const sendEmailQuery = (knex: Knex) => (
  userId: number,
  template: string,
  props: Object,
): PromiseLike<number> =>
  knex.raw(`
    insert into email (user_id, email, template, props)
    select
      "user".id, "user".email, ?, ?
    from "user"
    where "user".id = ?
  `, [template, JSON.stringify(props), userId]);

export default sendEmailQuery;
