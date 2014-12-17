create table documents (id int primary key, title text, url text);
.separator ","
.import collection14.csv documents
create table preferences (id int, attraction_id int, like int, rating int, primary key (id, attraction_id));
create table locations (id int primary key, name text, state text, lat real, lng real);
.import contexts14.csv locations
create table servers (key text, url text);
