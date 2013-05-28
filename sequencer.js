//Number of ticks in a pattern
var cols = 16;

//Time (in ms) between each tick
var rate = 200;

//Main sequencer object
var SEQUENCER = {
	//Array of source audio files for different browsers
	src: ['js_tone.ogg','js_tone.mp3'],
	
	//Directions for slicing the source audio into different note sprites, and what to call them 
	notes:
		[
			{name: 'D', start: 0, spriteSize: 4},
			{name: 'E', start: 4, spriteSize: 4},
			{name: 'F#', start: 8, spriteSize: 4},
			{name: 'A', start: 12, spriteSize: 4},
			{name: 'B', start: 16, spriteSize: 4},
			{name: 'D', start: 20, spriteSize: 4},
			{name: 'E', start: 24, spriteSize: 4},
			{name: 'F#', start: 28, spriteSize: 4}
		],

	//Sprite audio objects are placed here for future manipulation	
	sprite: {},

	//Data from location.hash goes here
	preset: {}
}

//Number of rows = number of note sprites
var rows = SEQUENCER.notes.length;

//System variable used to cycle through pattern
var playbackInterval = 0;

//When DOM is ready, load the appropriate source audio into an <audio> tag, and start building the UI once everything is loaded successfully
document.addEventListener('DOMContentLoaded', function(){
	if (typeof document.ontouchstart == 'undefined') {
		document.body.removeChild(document.querySelector('#trigger'));
		document.body.classList.add('initialized');
	}
	var _audioSource = document.createElement('audio');
	_audioSource.setAttribute('preload', 'auto');
	_audioSource.id = 'audio-source';
	_audioSource.autoplay = 'autoplay';
	_audioSource.volume = 0;
	_audioSource.addEventListener('canplaythrough', function(){
	  this.pause();
	  document.body.classList.remove('loading');
	  document.body.classList.add('loaded');
	  window.setTimeout(function(){
	  	document.querySelector('#loadbar').parentNode.removeChild(document.querySelector('#loadbar'));
	  	if (document.body.classList.contains('initialized')) {
	  		buildUI(rows,cols);
	  	}
	  },500);
	});	
	for (src in SEQUENCER.src) {
		if (
				(SEQUENCER.src[src].match(/\.mp3$/gi) != null && _audioSource.canPlayType('audio/mpeg')) ||
				(SEQUENCER.src[src].match(/\.ogg$/gi) != null && _audioSource.canPlayType('audio/ogg'))
			) {
			var s = document.createElement('source');
			s.setAttribute('src', SEQUENCER.src[src]);
			SEQUENCER.src = SEQUENCER.src[src];
			_audioSource.appendChild(s);
			break;
		}
	}
	document.head.appendChild(_audioSource);
	document.body.classList.add('loading');
});

//User input handler for iOS devices
//TODO: make this actually work
function init() {
	if (!document.body.classList.contains('initialized')) {
		document.body.classList.add('initialized');
		window.setTimeout(function(){
			document.body.removeChild(document.querySelector('#trigger'));
			if (typeof document.ontouchstart != 'undefined' && document.body.classList.contains('loaded')) {
				buildUI(rows,cols);
			}
		}, 500);
	}
}

//Slices the loaded source audio into audio sprites, and generates clickable <div> elements that control them
function buildUI(rows, cols, mode) {
	/* Create the audio objects */
	SEQUENCER.preset = {};
	if (location.hash) {
		hash = location.hash.substring(1).split('/');
		var parse = null;
		for (var i = 0; i < hash.length ; i += 3) {
			(function(i) {
				SEQUENCER.preset['au_'+hash[i]+'_'+hash[i+1]] = hash[i+2];
			})(i);
		}
	}
	if (mode == 'refresh') {
		for (var sprite in SEQUENCER.sprite) {
			if (typeof SEQUENCER.preset[sprite] != 'undefined') {
				SEQUENCER.sprite[sprite].volume = SEQUENCER.preset[sprite] / 100;
				document.querySelector('.node[data-link="'+sprite+'"]').classList.add('active');
			}
			else {
				SEQUENCER.sprite[sprite].volume = 0.5;
				document.querySelector('.node[data-link="'+sprite+'"]').classList.remove('active');
				
			}
			adjustVolumeDisplay(document.querySelector('.node[data-link="'+sprite+'"]'));
		}
	}
	if (!mode) {
		for (var i = 0; i < cols; i++) {
			(function(i){
				for (var j = 0; j < SEQUENCER.notes.length; j++) {
					
					(function(j){
						var v = SEQUENCER.notes[j];
						var size = (typeof v.spriteSize != 'undefined') ? v.spriteSize : SEQUENCER.spriteSize;
						var start = (typeof v.start != 'undefined') ? v.start : i * SEQUENCER.spriteSize;
						var finish = start + size;
						if (i == 0) {
							document.querySelector('#note-labels').innerHTML = '<div class="note-label">'+((typeof v.name != 'undefiend' && v.name.length > 0) ? v.name : '')+'</div>' +document.querySelector('#note-labels').innerHTML;
						}
						if (j == 0) {
							var col = document.createElement('div');
							col.classList.add('column');
							document.querySelector('#grid').appendChild(col);
						}
						else {
							var col = document.querySelectorAll('.column')[i];
						}
						var au = document.createElement('audio');
						au.src = SEQUENCER.src;
						if (typeof SEQUENCER.preset['au_'+i+'_'+j] != 'undefined') {
							au.volume = SEQUENCER.preset['au_'+i+'_'+j] / 100;
						}
						else {
							au.volume = 0.5;
						}
						au.preload = 'auto';
						au.dataset.start = start;
						au.dataset.end = finish;
						au.addEventListener('timeupdate', function(){
							if (this.currentTime > this.dataset.end - 0.3)
								this.pause();
						});
						SEQUENCER.sprite['au_'+i+'_'+j] = au;
						var el = document.createElement('div');
						el.classList.add('node');
						if (typeof SEQUENCER.preset['au_'+i+'_'+j] != 'undefined') {
							el.classList.add('active');
						}
						el.dataset.link = 'au_'+i+'_'+j;
						el.innerHTML = '<div class="volume-ind-wrap"><div class="volume-ind-num"></div><div class="volume-ind"/></div>';
						adjustVolumeDisplay(el);
						el.addEventListener('click', function(event){
							this.classList.toggle('active');
							updateHash();
						});
						el.addEventListener('mousedown', function(event){
							SEQUENCER.adjusting = {
								node: this,
								refY: event.pageY
							}
						});
						el.addEventListener('dblclick', function(event){
							au.volume = 0.5;
							updateHash();
						});
						col.insertBefore(el, col.firstChild);
					})(j);
				}
			})(i);
		}
		document.addEventListener('mousemove', function(event){
			if (!!SEQUENCER.adjusting) {
				var node = SEQUENCER.adjusting.node;
				var pos = SEQUENCER.adjusting.refY - event.pageY;
				var vol = parseFloat(SEQUENCER.sprite[node.dataset.link].volume);
				if (pos < 0)
					vol = Math.max(0,vol-0.01);
				else if (pos > 0)
					vol = Math.min(1,vol+0.01);
				SEQUENCER.sprite[node.dataset.link].volume = vol;
				adjustVolumeDisplay(node);
			}
		});
		document.addEventListener('mouseup', function() {
			if (SEQUENCER.adjusting) {
				SEQUENCER.adjusting = false;
				updateHash();
			}
		});
		window.addEventListener('popstate', function() {
			buildUI(rows,cols,'refresh');
		});
		window.setTimeout(play, 1000);
	}
}

//Cycles through each column in the pattern, playing any audio sprites activated by the user
function play() {
	if (playbackInterval < cols)
	{
		playbackInterval++;
	}
	else
	{
		playbackInterval = 1;
	}
	if (document.querySelector('.column.recent')) {
		document.querySelector('.column.recent').classList.remove('recent');
	}
	if (document.querySelector('.column.current')) {
		document.querySelector('.column.current').classList.add('recent');
		document.querySelector('.column.current').classList.remove('current');
	}
	document.querySelector('.column:nth-child('+playbackInterval+')').classList.add('current');
	var actives = document.querySelectorAll('.column')[playbackInterval-1].querySelectorAll('.node.active');
	for (var i = 0; i < actives.length; i++) {
		(function(i) {
			var a = SEQUENCER.sprite[actives[i].dataset.link];
			a.pause();
			a.currentTime = a.dataset.start;
			a.play();
		})(i);
	}
    window.setTimeout(function(){play();}, rate);
}

//Handles the innerHTML and CSS changes that accompany volume adjustment
function adjustVolumeDisplay(node) {
	var vol = SEQUENCER.sprite[node.dataset.link].volume;
	if (vol > 0.5) {
		node.querySelector('.volume-ind-wrap').classList.add('sup');
		node.querySelector('.volume-ind-wrap').classList.remove('sub');
	}
	else if (vol < 0.5) {
		node.querySelector('.volume-ind-wrap').classList.add('sub');
		node.querySelector('.volume-ind-wrap').classList.remove('sup');
	}	
	else
		node.querySelector('.volume-ind-wrap').classList.remove('sup', 'sub');
	if (vol < 0.15 || vol > 0.85)
		node.querySelector('.volume-ind-wrap').classList.add('threshold');
	else
		node.querySelector('.volume-ind-wrap').classList.remove('threshold');
	node.querySelector('.volume-ind').style.height = (Math.abs(0.5-vol)+0.5)*100+'%';
	node.querySelector('.volume-ind-wrap').style.opacity = (Math.abs(0.5-vol))*2;
	node.querySelector('.volume-ind-num').innerHTML = parseInt(vol*100)+'%';
}

//Updates location.hash based on user input, creating a sharable URL
function updateHash() {
	actives = document.querySelectorAll('.node.active');
	hash = '';
	for (var i = 0; i < actives.length; i++) {
		(function(i){
			hash += actives[i].dataset.link.substring(3).replace('_','/')+'/'+(parseInt(SEQUENCER.sprite[actives[i].dataset.link].volume*100))+'/';
		})(i);
	}
	location.hash = hash.substring(0,hash.length - 1);
}