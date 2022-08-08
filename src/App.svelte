<script>
	import supporters from "./data/supporters.js";
	import locales from "./data/locales.js";

	let locale = locales.EN;
</script>

<main>
	<h1>Lyon Code of Conduct</h1>

	<nav>
		<ul>
			<li  on:click={() => locale = locales.EN}>EN</li>
			<!--<li  on:click={() => locale = locales.FR}>FR</li>-->
		</ul>
	</nav>

	<p>{locale.slogan}</p>
	<h2>{locale.title_1}</h2>
	<p>{locale.desc_1}</p>
	<h2>{locale.title_2}</h2>
	<p>{locale.desc_2}</p>
	<h2>{locale.title_3}</h2>
	<p>{locale.desc_3}</p>
	<h2>{locale.title_4}</h2>
	<p>{locale.desc_4}</p>
	<h2>{locale.title_5}</h2>
	<p>{locale.desc_5}</p>
	<h2>{locale.title_6}</h2>
	<p>{locale.desc_7}</p>
	<h2>{locale.title_8}</h2>
	<p>{locale.desc_8}</p>
	<h2>{locale.title_9}</h2>
	<p>{locale.desc_9}</p>

	<div class="supporters">
		<h2>{locale.title_10}</h2>
		<p>{locale.desc_10}</p>
		<ul>
			{#each supporters as supporter}
				<li>
					{supporter.name}
				</li>
			{/each}
		</ul>
	</div>

</main>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;600&family=Space+Grotesk:wght@300&display=swap');
	@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap');

	main {
		width: 60vw;
		font-family: 'Lora', sans-serif;
		color: white;
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	nav ul {
		color: black;
		font-size: 40px;
		display: flex;
		font-weight: bold;
		justify-content: center;
	}
	nav ul li {
		margin: 0 1em;
		text-decoration: underline;
		cursor: pointer;
	}
	nav ul li:hover {
		color: gray;
	}

	h1 {
		font-family: 'Inter', sans-serif;
		font-size: 6em;
		color: white;
		background-color: black;
		text-transform: uppercase;
		font-weight: 600;
	}
	h2 {
		font-size: 2em;
		color: black;
		text-transform: uppercase;
		font-weight: 600;
		text-align: left;
	}

	p {
		color: black;
		text-align: left;
		font-size: 2em;
	}


	li {
		list-style: none;	
	}

	.supporters ul {
		font-size: 33px;
		font-weight: bold;
		font-family: Inter;
		color: black;
	}


	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>