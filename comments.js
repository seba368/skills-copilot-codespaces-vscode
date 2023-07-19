// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const {randomBytes} = require('crypto');
const axios = require('axios');

// Create express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Create routes
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});

app.post('/posts/:id/comments', async (req, res) => {
    // Create random id
    const commentId = randomBytes(4).toString('hex');

    // Get comment from request body
    const {content} = req.body;

    // Get comments for post
    const comments = commentsByPostId[req.params.id] || [];

    // Add new comment to comments list
    comments.push({id: commentId, content, status: 'pending'});

    // Update comments list
    commentsByPostId[req.params.id] = comments;

    // Emit event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            postId: req.params.id,
            status: 'pending'
        }
    });

    // Send response
    res.status(201).send(comments);
});

app.post('/events', async (req, res) => {
    console.log('Event Received:', req.body.type);

    // Get event type
    const {type, data} = req.body;

    // Check if event type is CommentModerated
    if (type === 'CommentModerated') {
        // Get post id and comment id
        const {postId, id, status, content} = data;

        // Get comments for post
        const comments = commentsByPostId[postId];

        // Find comment in comments list
        const comment = comments.find(comment => {
            return comment.id === id;
        });

        // Update comment status
        comment.status = status;

        // Emit event to event bus
        await axios.post('http://event-bus-srv:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                postId,
                status,
                content
            }
        });