/*!
 * Amplify Core 1.1.2
 *
 * Copyright 2011 - 2013 appendTo LLC. (http://appendto.com/team)
 * Dual licensed under the MIT or GPL licenses.
 * http://appendto.com/open-source-licenses
 *
 * http://amplifyjs.com
 */

define([ 'jquery', 'gui' ], function ($) {

	console.log('running amplify.core.js');

	(function (global, undefined) {

		let slice = [].slice,
			subscriptions = {};

		const amplify = global.amplify = {

			publish(topic) {

				if (typeof topic !== 'string') {

					throw new Error('You must provide a valid topic to publish.');

				}

				let args = slice.call(arguments, 1),
					topicSubscriptions,
					subscription,
					length,
					i = 0,
					ret;

			// console.log("Publish: " + topic + gui.parseObject(args, 2));
				let publishCallLog = `Publish: ${topic}`;
				for (let x = 0; x < args.length; x++) {

					publishCallLog += `\n  ${x}: `;
				// const argLine = (typeof args[x] == "string") ? args[x]:JSON.stringify(args[x]).replace(/\s*/g, "").replace(/\n/g, "");
					const argLine = (typeof args[x] === 'string') ? args[x] : JSON.stringify(args[x]);
					publishCallLog += (argLine === undefined) ? 'undefined' : `${argLine.slice(0, 150)}${argLine.length > 150 ? '...' : ''}`;

				}

				if (!subscriptions[topic]) {

					// console.log(`There are no subscriptions for ${topic}`);

					return true;

				}

				topicSubscriptions = subscriptions[topic].slice();

			// publishCallLog += "\n  subs: " + topicSubscriptions.length;
				// console.log(publishCallLog);

				for (length = topicSubscriptions.length; i < length; i++) {

					subscription = topicSubscriptions[i];
				// publishCallLog += (topic == 'testline') ? '\n  [0]: ' + topicSubscriptions[i].callback:'';
				// console.log("  topisSubscription[" + i + "]:", subscription);
					ret = subscription.callback.apply(subscription.context, args);
					if (ret === false) {
					// break;
					}
				// publishCallLog += '\n  ret: ' + ret;
				// publishCallLog += '\n  [0] ' + topicSubscriptions[i].callback;
				// console.log(publishCallLog);

				}
				return ret !== false;

			},

			subscribe(topic, context, callback, priority) {

			// console.log("Subscribe Call:",topic,"\n      callback:",callback,"\n      priority:",priority);
				console.log(`Subscribe: ${topic}`);
				if (typeof topic !== 'string') {

					throw new Error('You must provide a valid topic to create a subscription.');

				}

				if (arguments.length === 3 && typeof callback === 'number') {

					priority = callback;
					callback = context;
					context = null;

				}
				if (arguments.length === 2) {

					callback = context;
					context = null;

				}
				priority = priority || 10;

				let topicIndex = 0,
					topics = topic.split(/\s/),
					topicLength = topics.length,
					added;
				for (; topicIndex < topicLength; topicIndex++) {

					topic = topics[topicIndex];
					added = false;
					if (!subscriptions[topic]) {

						subscriptions[topic] = [];

					}

					let i = subscriptions[topic].length - 1,
						subscriptionInfo = {
							callback,
							context,
							priority
						};

					for (; i >= 0; i--) {

						if (subscriptions[topic][i].priority <= priority) {

							subscriptions[topic].splice(i + 1, 0, subscriptionInfo);
							added = true;
							break;

						}

					}

					if (!added) {

						subscriptions[topic].unshift(subscriptionInfo);

					}

				}

				return callback;

			},

			unsubscribe(topic, context, callback) {

				console.log(`Unsubscribe: ${topic}`);
				if (typeof topic !== 'string') {

					throw new Error('You must provide a valid topic to remove a subscription.');

				}

				if (arguments.length === 2) {

					callback = context;
					context = null;

				}

				if (!subscriptions[topic]) {

					return;

				}

				let length = subscriptions[topic].length,
					i = 0;

				for (; i < length; i++) {

					if (subscriptions[topic][i].callback === callback) {

						if (!context || subscriptions[topic][i].context === context) {

							subscriptions[topic].splice(i, 1);

						// Adjust counter and length for removed item
							i--;
							length--;

						}

					}

				}

			}
		};

		module.exports = global.amplify;
	// console.log("amplify.js - amplify: ",amplify);
	// console.log("module.exports: ",module.exports);

	}(this));

});
