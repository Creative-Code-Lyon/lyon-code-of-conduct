
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const supporters = [
        {
            "name": "Le Sequenceur",
            "location": "Lyon",
            "website" : "https://www.lesequenceur.fr/"
        },
        {
            "name": "Creative Code Lyon",
            "location": "Lyon",
            "website" : "https://creative-code-lyon.github.io/"
        }
    ];

    const locales = {
        EN : 
        {  
            "slogan": "A Code of Conduct for all User Groups and Conferences",
            "title_1": "Purpose",
            "desc_1": "A primary goal of all the conferences and user groups that refer to this Code of Conduct is to be inclusive \
        to the largest number of contributors, with the most varied and diverse backgrounds possible. As such, we are committed to providing a friendly, safe and welcoming environment for all, regardless of gender, sexual orientation, ability, ethnicity, socioeconomic status and religion (or lack thereof).\
        This Code of Conduct outlines our expectations for all those who participate in our community, as well as the consequences for unacceptable behavior. \
        We invite all those who participate in our events to help us create safe and positive experiences for everyone.",
            "title_2": "Open [Source/Culture/Tech] Citizenship",
            "desc_2" : "A supplemental goal of this Code of Conduct is to increase open [source/culture/tech] citizenship by encouraging participants to recognize and strengthen the relationships between our actions and their effects on our community.\
        Communities mirror the societies in which they exist and positive action is essential to counteract the many forms of inequality and abuses of power that exist in society.\
        If you see someone who is making an extra effort to ensure our community is welcoming, friendly, and encourages all participants to contribute to the fullest extent, we want to know.",
            "title_3": "Expected Behavior",
            "desc_3": [
                "Participate in an authentic and active way. In doing so, you contribute to the health and longevity of this community.",
                "Exercise consideration and respect in your speech and actions.",
                "Attempt collaboration before conflict.",
                "Refrain from demeaning, discriminatory, or harassing behavior and speech.",
                "Be mindful of your surroundings and of your fellow participants. Alert community leaders if you notice a dangerous situation, someone in distress, or violations of this Code of Conduct, even if they seem inconsequential."
            ],
            "title_4": "Unacceptable Behavior",
            "desc_4": "Unacceptable behaviors include: intimidating, harassing, abusive, discriminatory, derogatory or demeaning speech or actions by any participant in our community online, at all related events and in one-on-one communications carried out in the context of community business. Community event venues may be shared with members of the public; please be respectful to all patrons of these locations.\
        Harassment includes: harmful or prejudicial verbal or written comments related to gender, sexual orientation, race, religion, disability; inappropriate use of nudity and/or sexual images (including presentation slides); inappropriate depictions of violence (including presentation slides); deliberate intimidation, stalking or following; harassing photography or recording; sustained disruption of talks or other events; inappropriate physical contact, and unwelcome sexual attention.",
            "title_5": "Consequences of Unacceptable Behavior",
            "desc_5": "Unacceptable behavior from any community member, including sponsors and those with decision-making authority, will not be tolerated. Anyone asked to stop unacceptable behavior is expected to comply immediately.\
        If a community member engages in unacceptable behavior, the community organizers may take any action they deem appropriate, up to and including a temporary ban or permanent expulsion from the community without warning (and without refund in the case of a paid event).",
            "title_6": "If You Witness or Are Subject to Unacceptable Behavior",
            "desc_6": "If you are subject to or witness unacceptable behavior, or have any other concerns, please notify a community organizer as soon as possible. You can find a list of organizers to contact for each of the supporters of this code of conduct at the bottom of this page. Additionally, community organizers are available to help community members engage with local law enforcement or to otherwise help those experiencing unacceptable behavior feel safe. In the context of in-person events, organizers will also provide escorts as desired by the person experiencing distress.",
            "title_7": "Addressing Grievances",
            "desc_7": "If you feel you have been falsely or unfairly accused of violating this Code of Conduct, you should notify one of the event organizers with a concise description of your grievance. Your grievance will be handled in accordance with our existing governing policies.",
            "title_8": "Scope",
            "desc_8": "We expect all community participants (contributors, paid or otherwise; sponsors; and other guests) to abide by this Code of Conduct in all community venues—online and in-person—as well as in all one-on-one communications pertaining to community business.",
            "title_9": "License and attribution",
            "desc_9": "Berlin Code of Conduct is distributed under a Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0) license. It is based on the pdx.rb Code of Conduct.",
            "title_10": "Supporters",
            "desc_10": "Those user groups and conferences support the Lyon Code of Conduct:"
        },
        FR : 
        {  
            "slogan": "FRENCH A Code of Conduct for all User Groups and Conferences",
            "title_1": "Purpose",
            "desc_1": "A primary goal of all the conferences and user groups that refer to this Code of Conduct is to be inclusive \
        to the largest number of contributors, with the most varied and diverse backgrounds possible. As such, we are committed to providing a friendly, safe and welcoming environment for all, regardless of gender, sexual orientation, ability, ethnicity, socioeconomic status and religion (or lack thereof).\
        This Code of Conduct outlines our expectations for all those who participate in our community, as well as the consequences for unacceptable behavior. \
        We invite all those who participate in our events to help us create safe and positive experiences for everyone.",
            "title_2": "Open [Source/Culture/Tech] Citizenship",
            "desc_2" : "A supplemental goal of this Code of Conduct is to increase open [source/culture/tech] citizenship by encouraging participants to recognize and strengthen the relationships between our actions and their effects on our community.\
        Communities mirror the societies in which they exist and positive action is essential to counteract the many forms of inequality and abuses of power that exist in society.\
        If you see someone who is making an extra effort to ensure our community is welcoming, friendly, and encourages all participants to contribute to the fullest extent, we want to know.",
            "title_3": "Expected Behavior",
            "desc_3": [
                "Participate in an authentic and active way. In doing so, you contribute to the health and longevity of this community.",
                "Exercise consideration and respect in your speech and actions.",
                "Attempt collaboration before conflict.",
                "Refrain from demeaning, discriminatory, or harassing behavior and speech.",
                "Be mindful of your surroundings and of your fellow participants. Alert community leaders if you notice a dangerous situation, someone in distress, or violations of this Code of Conduct, even if they seem inconsequential."
            ],
            "title_4": "Unacceptable Behavior",
            "desc_4": "Unacceptable behaviors include: intimidating, harassing, abusive, discriminatory, derogatory or demeaning speech or actions by any participant in our community online, at all related events and in one-on-one communications carried out in the context of community business. Community event venues may be shared with members of the public; please be respectful to all patrons of these locations.\
        Harassment includes: harmful or prejudicial verbal or written comments related to gender, sexual orientation, race, religion, disability; inappropriate use of nudity and/or sexual images (including presentation slides); inappropriate depictions of violence (including presentation slides); deliberate intimidation, stalking or following; harassing photography or recording; sustained disruption of talks or other events; inappropriate physical contact, and unwelcome sexual attention.",
            "title_5": "Consequences of Unacceptable Behavior",
            "desc_5": "Unacceptable behavior from any community member, including sponsors and those with decision-making authority, will not be tolerated. Anyone asked to stop unacceptable behavior is expected to comply immediately.\
        If a community member engages in unacceptable behavior, the community organizers may take any action they deem appropriate, up to and including a temporary ban or permanent expulsion from the community without warning (and without refund in the case of a paid event).",
            "title_6": "If You Witness or Are Subject to Unacceptable Behavior",
            "desc_6": "If you are subject to or witness unacceptable behavior, or have any other concerns, please notify a community organizer as soon as possible. You can find a list of organizers to contact for each of the supporters of this code of conduct at the bottom of this page. Additionally, community organizers are available to help community members engage with local law enforcement or to otherwise help those experiencing unacceptable behavior feel safe. In the context of in-person events, organizers will also provide escorts as desired by the person experiencing distress.",
            "title_7": "Addressing Grievances",
            "desc_7": "If you feel you have been falsely or unfairly accused of violating this Code of Conduct, you should notify one of the event organizers with a concise description of your grievance. Your grievance will be handled in accordance with our existing governing policies.",
            "title_8": "Scope",
            "desc_8": "We expect all community participants (contributors, paid or otherwise; sponsors; and other guests) to abide by this Code of Conduct in all community venues—online and in-person—as well as in all one-on-one communications pertaining to community business.",
            "title_9": "License and attribution",
            "desc_9": "Berlin Code of Conduct is distributed under a Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0) license. It is based on the pdx.rb Code of Conduct.",
            "title_10": "Supporters",
            "desc_10": "Those user groups and conferences support the Lyon Code of Conduct:"
        }
    };

    /* src\App.svelte generated by Svelte v3.47.0 */
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (40:3) {#each supporters as supporter}
    function create_each_block(ctx) {
    	let li;
    	let t0_value = /*supporter*/ ctx[3].name + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(li, "class", "svelte-h0buoz");
    			add_location(li, file, 40, 4, 873);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(40:3) {#each supporters as supporter}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let nav;
    	let ul0;
    	let li0;
    	let t3;
    	let li1;
    	let t5;
    	let p0;
    	let t6_value = /*locale*/ ctx[0].slogan + "";
    	let t6;
    	let t7;
    	let h20;
    	let t8_value = /*locale*/ ctx[0].title_1 + "";
    	let t8;
    	let t9;
    	let p1;
    	let t10_value = /*locale*/ ctx[0].desc_1 + "";
    	let t10;
    	let t11;
    	let h21;
    	let t12_value = /*locale*/ ctx[0].title_2 + "";
    	let t12;
    	let t13;
    	let p2;
    	let t14_value = /*locale*/ ctx[0].desc_2 + "";
    	let t14;
    	let t15;
    	let h22;
    	let t16_value = /*locale*/ ctx[0].title_3 + "";
    	let t16;
    	let t17;
    	let p3;
    	let t18_value = /*locale*/ ctx[0].desc_3 + "";
    	let t18;
    	let t19;
    	let h23;
    	let t20_value = /*locale*/ ctx[0].title_4 + "";
    	let t20;
    	let t21;
    	let p4;
    	let t22_value = /*locale*/ ctx[0].desc_4 + "";
    	let t22;
    	let t23;
    	let h24;
    	let t24_value = /*locale*/ ctx[0].title_5 + "";
    	let t24;
    	let t25;
    	let p5;
    	let t26_value = /*locale*/ ctx[0].desc_5 + "";
    	let t26;
    	let t27;
    	let h25;
    	let t28_value = /*locale*/ ctx[0].title_6 + "";
    	let t28;
    	let t29;
    	let p6;
    	let t30_value = /*locale*/ ctx[0].desc_7 + "";
    	let t30;
    	let t31;
    	let h26;
    	let t32_value = /*locale*/ ctx[0].title_8 + "";
    	let t32;
    	let t33;
    	let p7;
    	let t34_value = /*locale*/ ctx[0].desc_8 + "";
    	let t34;
    	let t35;
    	let h27;
    	let t36_value = /*locale*/ ctx[0].title_9 + "";
    	let t36;
    	let t37;
    	let p8;
    	let t38_value = /*locale*/ ctx[0].desc_9 + "";
    	let t38;
    	let t39;
    	let div;
    	let h28;
    	let t40_value = /*locale*/ ctx[0].title_10 + "";
    	let t40;
    	let t41;
    	let p9;
    	let t42_value = /*locale*/ ctx[0].desc_10 + "";
    	let t42;
    	let t43;
    	let ul1;
    	let mounted;
    	let dispose;
    	let each_value = supporters;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Lyon Code of Conduct";
    			t1 = space();
    			nav = element("nav");
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "EN";
    			t3 = space();
    			li1 = element("li");
    			li1.textContent = "FR";
    			t5 = space();
    			p0 = element("p");
    			t6 = text(t6_value);
    			t7 = space();
    			h20 = element("h2");
    			t8 = text(t8_value);
    			t9 = space();
    			p1 = element("p");
    			t10 = text(t10_value);
    			t11 = space();
    			h21 = element("h2");
    			t12 = text(t12_value);
    			t13 = space();
    			p2 = element("p");
    			t14 = text(t14_value);
    			t15 = space();
    			h22 = element("h2");
    			t16 = text(t16_value);
    			t17 = space();
    			p3 = element("p");
    			t18 = text(t18_value);
    			t19 = space();
    			h23 = element("h2");
    			t20 = text(t20_value);
    			t21 = space();
    			p4 = element("p");
    			t22 = text(t22_value);
    			t23 = space();
    			h24 = element("h2");
    			t24 = text(t24_value);
    			t25 = space();
    			p5 = element("p");
    			t26 = text(t26_value);
    			t27 = space();
    			h25 = element("h2");
    			t28 = text(t28_value);
    			t29 = space();
    			p6 = element("p");
    			t30 = text(t30_value);
    			t31 = space();
    			h26 = element("h2");
    			t32 = text(t32_value);
    			t33 = space();
    			p7 = element("p");
    			t34 = text(t34_value);
    			t35 = space();
    			h27 = element("h2");
    			t36 = text(t36_value);
    			t37 = space();
    			p8 = element("p");
    			t38 = text(t38_value);
    			t39 = space();
    			div = element("div");
    			h28 = element("h2");
    			t40 = text(t40_value);
    			t41 = space();
    			p9 = element("p");
    			t42 = text(t42_value);
    			t43 = space();
    			ul1 = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h1, "class", "svelte-h0buoz");
    			add_location(h1, file, 8, 1, 145);
    			attr_dev(li0, "class", "svelte-h0buoz");
    			add_location(li0, file, 12, 3, 193);
    			attr_dev(li1, "class", "svelte-h0buoz");
    			add_location(li1, file, 13, 3, 246);
    			attr_dev(ul0, "class", "svelte-h0buoz");
    			add_location(ul0, file, 11, 2, 185);
    			attr_dev(nav, "class", "svelte-h0buoz");
    			add_location(nav, file, 10, 1, 177);
    			attr_dev(p0, "class", "svelte-h0buoz");
    			add_location(p0, file, 17, 1, 314);
    			attr_dev(h20, "class", "svelte-h0buoz");
    			add_location(h20, file, 18, 1, 338);
    			attr_dev(p1, "class", "svelte-h0buoz");
    			add_location(p1, file, 19, 1, 365);
    			attr_dev(h21, "class", "svelte-h0buoz");
    			add_location(h21, file, 20, 1, 389);
    			attr_dev(p2, "class", "svelte-h0buoz");
    			add_location(p2, file, 21, 1, 416);
    			attr_dev(h22, "class", "svelte-h0buoz");
    			add_location(h22, file, 22, 1, 440);
    			attr_dev(p3, "class", "svelte-h0buoz");
    			add_location(p3, file, 23, 1, 467);
    			attr_dev(h23, "class", "svelte-h0buoz");
    			add_location(h23, file, 24, 1, 491);
    			attr_dev(p4, "class", "svelte-h0buoz");
    			add_location(p4, file, 25, 1, 518);
    			attr_dev(h24, "class", "svelte-h0buoz");
    			add_location(h24, file, 26, 1, 542);
    			attr_dev(p5, "class", "svelte-h0buoz");
    			add_location(p5, file, 27, 1, 569);
    			attr_dev(h25, "class", "svelte-h0buoz");
    			add_location(h25, file, 28, 1, 593);
    			attr_dev(p6, "class", "svelte-h0buoz");
    			add_location(p6, file, 29, 1, 620);
    			attr_dev(h26, "class", "svelte-h0buoz");
    			add_location(h26, file, 30, 1, 644);
    			attr_dev(p7, "class", "svelte-h0buoz");
    			add_location(p7, file, 31, 1, 671);
    			attr_dev(h27, "class", "svelte-h0buoz");
    			add_location(h27, file, 32, 1, 695);
    			attr_dev(p8, "class", "svelte-h0buoz");
    			add_location(p8, file, 33, 1, 722);
    			attr_dev(h28, "class", "svelte-h0buoz");
    			add_location(h28, file, 36, 2, 774);
    			attr_dev(p9, "class", "svelte-h0buoz");
    			add_location(p9, file, 37, 2, 803);
    			attr_dev(ul1, "class", "svelte-h0buoz");
    			add_location(ul1, file, 38, 2, 829);
    			attr_dev(div, "class", "supporters svelte-h0buoz");
    			add_location(div, file, 35, 1, 747);
    			attr_dev(main, "class", "svelte-h0buoz");
    			add_location(main, file, 7, 0, 137);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, nav);
    			append_dev(nav, ul0);
    			append_dev(ul0, li0);
    			append_dev(ul0, t3);
    			append_dev(ul0, li1);
    			append_dev(main, t5);
    			append_dev(main, p0);
    			append_dev(p0, t6);
    			append_dev(main, t7);
    			append_dev(main, h20);
    			append_dev(h20, t8);
    			append_dev(main, t9);
    			append_dev(main, p1);
    			append_dev(p1, t10);
    			append_dev(main, t11);
    			append_dev(main, h21);
    			append_dev(h21, t12);
    			append_dev(main, t13);
    			append_dev(main, p2);
    			append_dev(p2, t14);
    			append_dev(main, t15);
    			append_dev(main, h22);
    			append_dev(h22, t16);
    			append_dev(main, t17);
    			append_dev(main, p3);
    			append_dev(p3, t18);
    			append_dev(main, t19);
    			append_dev(main, h23);
    			append_dev(h23, t20);
    			append_dev(main, t21);
    			append_dev(main, p4);
    			append_dev(p4, t22);
    			append_dev(main, t23);
    			append_dev(main, h24);
    			append_dev(h24, t24);
    			append_dev(main, t25);
    			append_dev(main, p5);
    			append_dev(p5, t26);
    			append_dev(main, t27);
    			append_dev(main, h25);
    			append_dev(h25, t28);
    			append_dev(main, t29);
    			append_dev(main, p6);
    			append_dev(p6, t30);
    			append_dev(main, t31);
    			append_dev(main, h26);
    			append_dev(h26, t32);
    			append_dev(main, t33);
    			append_dev(main, p7);
    			append_dev(p7, t34);
    			append_dev(main, t35);
    			append_dev(main, h27);
    			append_dev(h27, t36);
    			append_dev(main, t37);
    			append_dev(main, p8);
    			append_dev(p8, t38);
    			append_dev(main, t39);
    			append_dev(main, div);
    			append_dev(div, h28);
    			append_dev(h28, t40);
    			append_dev(div, t41);
    			append_dev(div, p9);
    			append_dev(p9, t42);
    			append_dev(div, t43);
    			append_dev(div, ul1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul1, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(li0, "click", /*click_handler*/ ctx[1], false, false, false),
    					listen_dev(li1, "click", /*click_handler_1*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*locale*/ 1 && t6_value !== (t6_value = /*locale*/ ctx[0].slogan + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*locale*/ 1 && t8_value !== (t8_value = /*locale*/ ctx[0].title_1 + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*locale*/ 1 && t10_value !== (t10_value = /*locale*/ ctx[0].desc_1 + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*locale*/ 1 && t12_value !== (t12_value = /*locale*/ ctx[0].title_2 + "")) set_data_dev(t12, t12_value);
    			if (dirty & /*locale*/ 1 && t14_value !== (t14_value = /*locale*/ ctx[0].desc_2 + "")) set_data_dev(t14, t14_value);
    			if (dirty & /*locale*/ 1 && t16_value !== (t16_value = /*locale*/ ctx[0].title_3 + "")) set_data_dev(t16, t16_value);
    			if (dirty & /*locale*/ 1 && t18_value !== (t18_value = /*locale*/ ctx[0].desc_3 + "")) set_data_dev(t18, t18_value);
    			if (dirty & /*locale*/ 1 && t20_value !== (t20_value = /*locale*/ ctx[0].title_4 + "")) set_data_dev(t20, t20_value);
    			if (dirty & /*locale*/ 1 && t22_value !== (t22_value = /*locale*/ ctx[0].desc_4 + "")) set_data_dev(t22, t22_value);
    			if (dirty & /*locale*/ 1 && t24_value !== (t24_value = /*locale*/ ctx[0].title_5 + "")) set_data_dev(t24, t24_value);
    			if (dirty & /*locale*/ 1 && t26_value !== (t26_value = /*locale*/ ctx[0].desc_5 + "")) set_data_dev(t26, t26_value);
    			if (dirty & /*locale*/ 1 && t28_value !== (t28_value = /*locale*/ ctx[0].title_6 + "")) set_data_dev(t28, t28_value);
    			if (dirty & /*locale*/ 1 && t30_value !== (t30_value = /*locale*/ ctx[0].desc_7 + "")) set_data_dev(t30, t30_value);
    			if (dirty & /*locale*/ 1 && t32_value !== (t32_value = /*locale*/ ctx[0].title_8 + "")) set_data_dev(t32, t32_value);
    			if (dirty & /*locale*/ 1 && t34_value !== (t34_value = /*locale*/ ctx[0].desc_8 + "")) set_data_dev(t34, t34_value);
    			if (dirty & /*locale*/ 1 && t36_value !== (t36_value = /*locale*/ ctx[0].title_9 + "")) set_data_dev(t36, t36_value);
    			if (dirty & /*locale*/ 1 && t38_value !== (t38_value = /*locale*/ ctx[0].desc_9 + "")) set_data_dev(t38, t38_value);
    			if (dirty & /*locale*/ 1 && t40_value !== (t40_value = /*locale*/ ctx[0].title_10 + "")) set_data_dev(t40, t40_value);
    			if (dirty & /*locale*/ 1 && t42_value !== (t42_value = /*locale*/ ctx[0].desc_10 + "")) set_data_dev(t42, t42_value);

    			if (dirty & /*supporters*/ 0) {
    				each_value = supporters;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let locale = locales.EN;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(0, locale = locales.EN);
    	const click_handler_1 = () => $$invalidate(0, locale = locales.FR);
    	$$self.$capture_state = () => ({ supporters, locales, locale });

    	$$self.$inject_state = $$props => {
    		if ('locale' in $$props) $$invalidate(0, locale = $$props.locale);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [locale, click_handler, click_handler_1];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({

    	target: document.body,
    	props: {
    		name: 'world',
    		artists: [
    			{
    				name : 'Arthur Baude', 
    				nomination: "Designer Maker",
    				imgUrl: 'https://www.aht.li/3160494/avatar.jpg',
    				bio: "Issu d'une formation multimédia puis arts appliqués, j’ai découvert le milieu maker à la fin de mes études où j’ai pu me former en autodidacte à l'électronique interactive et à la fabrication numérique.Passionné par ces différents univers, je les intègre en permanence dans mon travail en mélangeant design, création artistique et fabrication numérique. Après 3 ans passé chez nod-A en tant que designer / maker / facilitateur, je travaille désormais en freelance. Depuis 2016, je consacre une grande part de mon temps professionnel à concevoir et donner des formations à la fabrication numérique et au monde maker dans sa globalité.",
    				social : [
    					{name: "instagram", url:"https://twitter.com/arthur_baude"},
    					{name: "facebook", url:"https://twitter.com/arthur_baude"},
    					{name: "twitch", url:"https://twitter.com/arthur_baude"}
    				]
    			},
    			{
    				name : 'Makio135', 
    				nomination: "Generative Artist",
    				imgUrl: 'https://images.squarespace-cdn.com/content/v1/5ed6306308e08b2bda7645bf/1617275774364-UWXUN83QQ8YC0NQBYY1N/QmYqaCmnERMTdEqnCkoeBtGcBE8DSzwBjbEvYs74vepGr1.gif?format=2500w',
    				bio: "",
    				social : [
    					{name: "instagram", url:"https://twitter.com/arthur_baude"},

    			]
    			},
    			{
    				name : 'Romain Darracq', 
    				nomination: "Musician",
    				imgUrl: 'https://www.grame.fr/assets/f1920x1200-q85-p1/bcd98a4b/romain_darracq.jpg',
    				bio: "",
    				social : [
    					{name: "instagram", url:"https://twitter.com/arthur_baude"},
    					{name: "facebook", url:"https://twitter.com/arthur_baude"},
    					{name: "twitch", url:"https://twitter.com/arthur_baude"}
    				]
    			},
    			{
    				name : 'Paul Ycorne', 
    				nomination: "VJ / Motion Design",
    				imgUrl: '',
    				bio: "",
    				social : [
    					{name: "instagram", url:"https://twitter.com/arthur_baude"},
    					{name: "facebook", url:"https://twitter.com/arthur_baude"},
    					{name: "twitch", url:"https://twitter.com/arthur_baude"}
    				]
    			},
    			{
    				name : 'Martial Geoffre-Rouland', 
    				nomination: "Studio Screen Club",
    				imgUrl: 'https://avatars.githubusercontent.com/u/157709?v=4',
    				bio: "",
    				social : [
    					{name: "instagram", url:"https://twitter.com/arthur_baude"},
    					{name: "facebook", url:"https://twitter.com/arthur_baude"},
    					{name: "twitch", url:"https://twitter.com/arthur_baude"}
    				]
    			},
    		]
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
