create table documents (id int primary key, title text, url text, description text);
.separator ","
.import collection14.csv documents
create table preferences (user_id int, attraction_id int, value text, updated_on date, primary key (user_id, attraction_id));
create table locations (id int primary key, name text, state text, lat real, lng real);
.import contexts14.csv locations
create table servers (key text, url text, deleted_on date);
create table suggestion_requests (body text);
create table suggestion_responses (request_id int, url text, body text, primary key (request_id, url));
