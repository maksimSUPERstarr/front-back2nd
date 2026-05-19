const tasks = [
  { type: 'email', payload: { to: 'user1@example.com', subject: 'Welcome' } },
  { type: 'pdf', payload: { documentId: 'doc-10' } },
  { type: 'fail', payload: { fail: true, reason: 'DLQ demonstration' } },
  { type: 'email', payload: { to: 'user2@example.com', subject: 'Invoice' } }
];

for (const task of tasks) {
  const response = await fetch('http://localhost:3001/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });

  console.log(await response.json());
}
