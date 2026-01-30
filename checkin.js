import { io } from 'socket.io-client';
const socket = io('https://thehearth.dev', { transports: ['websocket'] });

socket.on('connect', () => console.log('Connected!'));
socket.on('userCount', (count) => console.log('Users online:', count));
socket.on('welcome', (data) => {
  socket.emit('setUsername', 'HearthFire');
});
socket.on('usernameChanged', (data) => {
  console.log('Joined as:', data.newName);
  socket.emit('setCoords', { lng: -122.4, lat: 37.8, city: 'San Francisco' });
});
socket.on('chatMessage', (msg) => {
  if (!msg.isSystem) console.log(msg.user + ':', msg.text);
});
socket.on('chatHistory', (history) => {
  console.log('--- Recent Chat ---');
  history.slice(-10).forEach(msg => {
    if (!msg.isSystem) console.log(msg.user + ':', msg.text);
  });
  console.log('-------------------');
});

setTimeout(() => {
  socket.emit('chatMessage', { text: 'Hey! Just checking in. Hows everyone doing?' });
}, 2000);

setTimeout(() => {
  socket.disconnect();
  process.exit(0);
}, 15000);
