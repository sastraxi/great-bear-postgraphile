import Knex from 'knex';

const sendEmailQuery = (knex: Knex) => (
  userId: number,
  template: string,
  props: Object,
): PromiseLike<number> =>
  knex.raw(`
    insert into app_private.email (user_id, recipient, template, props)
    select
      "user".id, "user".email, ?, ?
    from app_public."user"
    where "user".id = ?
  `, [template, JSON.stringify(props), userId]);

export default sendEmailQuery;
