// forgot to add a unique constraint :O
exports.up = knex =>
  knex.raw(` 
    /* wherever we have duplicate session IDs,
       select every cart ID but the smallest */
    create temporary table del_cart_ids as
      select distinct b.id as id
      from app_public."cart" a
      inner join app_public."cart" b
        on a.session_id = b.session_id and a.id < b.id;

    delete from app_public."cart_item" where cart_id in (select id from del_cart_ids);
    delete from app_public."cart" where id in (select id from del_cart_ids);

    drop table del_cart_ids;

    alter table app_public."cart"
      add constraint cart_session_id_key
      unique (session_id);
  `);

exports.down = knex =>
  knex.raw(`
    alter table app_public."cart"
      drop constraint cart_session_id_key;
  `);
