const express = require("express");
const path = require("path");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

const dbPath = path.join(__dirname, "todoApplication.db");

let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

//API 1

app.get("/todos/", async (request, response) => {
  const {
    status = "",
    priority = "",
    search_q = "",
    category = "",
  } = request.query;
  const getTodosQuery = `
    SELECT
      *
    FROM
     todo
    WHERE
     status LIKE '%${status}%'
     AND priority LIKE '%${priority}%'
     AND category LIKE '%${category}%'
     AND todo LIKE '%${search_q}%';`;
  const todosArray = await database.all(getTodosQuery);
  response.send(
    todosArray.map((eachPlayer) => convertDbObjectToResponseObject(eachPlayer))
  );
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT 
      * 
    FROM 
      todo
    WHERE 
      id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  response.send(convertDbObjectToResponseObject(todo));
});

//API 3 agenda

app.get("/agenda/", async (request, response) => {
  try {
    const { date } = request.query;
    const valid = await isValid(new Date(date));
    console.log(valid);
    if (valid === false) {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      const reqDate = new Date(date);
      console.log(reqDate);
      const result = format(reqDate, "yyyy-MM-dd");
      console.log(result);
      //   const due_date = result.toString();
      console.log(reqDate.getFullYear());
      console.log(reqDate.getMonth() + 1);
      console.log(reqDate.getDate());
      const getTodoQuery = `
      SELECT  
         * 
      FROM 
        todo 
      WHERE 
     strftime('%Y', due_date) = "${reqDate.getFullYear()}"
     AND CAST(strftime('%m', due_date) AS INTEGER) = ${reqDate.getMonth() + 1}
     AND CAST(strftime('%d', due_date) AS INTEGER) = ${reqDate.getDate()};`;
      const todo = await database.get(getTodoQuery);
      response.send(convertDbObjectToResponseObject(todo));
    }
  } catch (e) {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//Api 4

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status, category, due_date)
  VALUES
    (
     ${id},
    '${todo}',
    '${priority}',
    '${status}',
    '${category}',
    '${dueDate}'
      );`;
  const Todo = await database.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

// APi 5

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const todoDetails = request.body;
  const previousTodoQuery = `
  SELECT * FROM todo
  WHERE
    id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);
  console.log(previousTodo);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  const updateTodoQuery = `UPDATE
      todo
    SET
       todo='${todo}',
       priority='${priority}',
       status='${status}'
       category='${category}'
       due_date='${dueDate}'
      
    WHERE
      id = ${todoId};`;
  await database.run(updateTodoQuery);

  if (todoDetails.status === status) {
    response.send("Status Updated");
  } else if (todoDetails.priority === priority) {
    response.send("Priority Updated");
  } else if (todoDetails.todo === todo) {
    response.send("Todo Updated");
  } else if (todoDetails.category === category) {
    response.send("Category Updated");
  } else if (todoDetails.dueDate === dueDate) {
    response.send("Due Date Updated");
  }
});

//api 6

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM 
      todo
    WHERE
     id = ${todoId};`;
  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
