# PSQL RM
Postgres Relational Mapper

### Setup
<ul>
  <li>npm install @waghravi/psqlrm</li>
  <li>Configure database connection in .env file as per instruction in the <b>Configuration</b> section</li>
  <li>run command npm start</li>
</ul>

### Configuration
Change the configuration to connect database in .env file
<table>
  <thead>
    <tr>
      <th>Key</th>
      <th>Value</th>
      <th>Comments</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        PORT
      </td>
      <td>
        80
      </td>
      <td>
        Port can be changed
      </td>
    </tr>
    <tr>
      <td>
        PG_DB_HOST
      </td>
      <td>
        127.0.0.1
      </td>
      <td>
        Database host can be changed
      </td>
    </tr>
    <tr>
      <td>
        PG_DB_PORT
      </td>
      <td>
        5432
      </td>
      <td>
        Database port can be changed
      </td>
    </tr>
    <tr>
      <td>
        PG_DB_USER
      </td>
      <td>
        postgres
      </td>
      <td>
        Database Username can be changed
      </td>
    </tr>
    <tr>
      <td>
        PG_DB_PASS
      </td>
      <td>
        <strike>postgres123</strike>
      </td>
      <td>
        Database Password can be changed
      </td>
    </tr>
    <tr>
      <td>
        PG_DB_NAME
      </td>
      <td>
        postgres
      </td>
      <td>
        Database Name can be changed
      </td>
    </tr>
  </tbody>
</table>

### Queries
<ol>
  <li>tables</li>
  <li>columns</li>
  <li>foreignkeys</li>
  <li>select</li>
  <li>distinct</li>
  <li>avg</li>
  <li>count</li>
  <li>max</li>
  <li>min</li>
  <li>sum</li>
</ol>

### Mutation
<ol>
  <li>insert</li>
  <li>update</li>
  <li>delete</li>
  <li>
    <ul>
      database transaction
      <li>simple</li>
      <li>complex</li>
    </ul>
  </li>
</ol>

### Examples
#### tables
##### graphql
<pre>
  query {
    tables
  }
</pre>