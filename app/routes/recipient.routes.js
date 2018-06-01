const express = require('express');
const router = express.Router();

const { isAuthenticated, isAdmin } = require('../middleware');
const strings = require.main.require('./app/config/strings.js');
const IFTTTService = require.main.require('./app/services/ifttt.service.js');

const Recipient = require.main.require('./app/models/recipient');
const Message = require.main.require('./app/models/message');


// Get all recipients
router.get('/', async (req, res) => {
	// if (!req.user) return res.status(401).json({message: strings.unauthenticated});
	// if (!req.user.isAdmin) return res.status(403).json({message: strings.unauthorized});
	
	try {
		const recipients = await Recipient.find().sort('-createdAt').populate({path: 'addedBy', select: 'name'});
		return res.status(200).json(recipients);
	} catch (err) {
		return res.status(400).json(err);
	}
});

// Get user's recipients
router.get('/me', isAuthenticated, async (req, res) => {
	const animalType = req.query.animal_type;
	
	try {
		const recipients = await Recipient.findWithDeleted({
			addedBy: req.user._id,
			subscriptions: animalType ? { $in: animalType.split(',') } : { $exists: true }
		}).sort('name');
		
		return res.status(200).json(recipients);
	} catch (err) {
		return res.status(400).json(err);
	}
});

// Add new recipient(s)
router.post('/', isAuthenticated, async (req, res) => {
	
	var io = req.app.get('socketio');
	
	if (Array.isArray(req.body)) {
		
		// Submit multiple recipients
		
		var contacts = req.body.map(o => {
			o.addedBy = req.user._id;
			return o;
		});
		
		try {
			const recipients = await Recipient.create(contacts);
			
			for (var i = 0; i < recipients.length; i++) {
				io.emit('message', {message: strings.welcomeMessage, recipient: recipients[i]});
				IFTTTService.sendSingleMessage({number: recipients[i].number, message: strings.welcomeMessage});
			}
			
			return res.status(200).json({
				addedRecipients: recipients
			});
		}
		
		catch (err) {
			if (err.writeErrors) err.message = err.writeErrors.length + ' ' + (err.writeErrors.length == 1 ? 'contact' : 'contacts') + ' failed to submit';
			return res.status(400).json(err);
		}
		
	} else {
		// Submit one recipient
		
		var newRecipient = new Recipient({
			name: req.body.name,
			number: req.body.number.replace(/\D/g,'').replace(/^1+/, ''),
			addedBy: req.user._id
		});
		
		try {
			const recipient = await newRecipient.save();
			
			io.emit('message', {message: strings.welcomeMessage, recipient: recipient});
			IFTTTService.sendSingleMessage({number: recipient.number, message: strings.welcomeMessage});
			
			return res.status(200).json(recipient);
		}
		
		catch (err) {
			return res.status(400).json(err);
		}
	}
});

router.patch('/:recipientId', isAuthenticated, async (req, res) => {

	// TODO: only allow to edit recipient if user isAdmin or is addedBy them
	
	try {
		const recipient = await Recipient.update({_id: req.params.recipientId}, {
			$set: {
				name: req.body.name,
				number: req.body.number
			}
		});
		
		return res.status(200).json(recipient);
	}
	
	catch (err) {
		return res.status(err.statusCode || 400).json(err);
	}
});

router.delete('/', isAuthenticated, async (req, res) => {
	
	const query = {_id: {$in: req.query.recipients}};
	
	const action = req.query.soft == 'false' ? 'remove' : 'delete';
	
	if (!req.user.isAdmin && action == 'remove') {
		return res.status(403).json({message: strings.unauthorized});
	}

	// TODO: only allow to delete recipient if user is addedBy them
	
	try {
		const data = await Recipient[action](query);
		return res.status(200).json(data);
	}
	catch (err) {
		return res.status(400).json(err);
	}
});

// Get a recipient's catversation
router.get('/:number/conversation', isAuthenticated, async (req, res) => {
	
	try {
		const results = await Promise.all([
			Recipient.findOne({addedBy: req.user._id, number: req.params.number}),
			Message.find({number: req.params.number})
		]);
		
		if (results[0]) {
			return res.status(200).json(results[1]);
		} else {
			return res.status(403).json({message: "You aren't facting this person"});
		}
	}
	
	catch (err) {
		return res.status(400).json(err);
	}
});

module.exports = router;