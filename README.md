curl -XPUT http://localhost:3000/api/event/new -H "Content-Type: application/json" -d '{ "title": "Deploy", "user": "purplefish32", "avatar": "https://avatars.githubusercontent.com/u/479917", "branch": "my-super-branch", "app": "self"}'

nodemon --harmony index.js