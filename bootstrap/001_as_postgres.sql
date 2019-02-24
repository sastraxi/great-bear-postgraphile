create database gbpg;

/* our app / postgraphile will connect as this user */
create user greatbear with password 'greatbear';
grant all privileges on database gbpg to greatbear;
