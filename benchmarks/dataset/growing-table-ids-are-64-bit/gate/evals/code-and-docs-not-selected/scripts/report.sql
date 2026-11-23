CREATE TEMP TABLE daily_counts (day date, n integer);
INSERT INTO daily_counts SELECT date_trunc('day', "createdAt"), count(*) FROM "Post" GROUP BY 1;
