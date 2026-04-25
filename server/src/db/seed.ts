import Database from 'better-sqlite3';
import { createSong } from './songs.js';

export function seedIfEmpty(db: Database.Database): void {
  const count = (db.prepare('SELECT COUNT(*) as c FROM songs').get() as { c: number }).c;
  if (count > 0) return;

  createSong(db, {
    title: "Last Call at Lindy's",
    artist: 'The Hollow Frets',
    key: 'A',
    tempo: 112,
    duration: '3:45',
    notes: '',
    chart_guitar: `Verse:\nA  E  F#m  D  (x4)\n\nPre-Chorus:\nD  E  D  E\n\nChorus:\nA  D  A  E\nA  D  E  E\n\nBridge:\nF#m  D  A  E  (x2)\nF#m  D  E  E\n\nOutro:\nA  E  A  (let ring)`,
    chart_bass: `Verse: Root-5 pattern on A E F#m D\nChorus: Walk up A→D on beat 4 of bar 1\n\nFeel: Driving eighth notes, sit behind the beat`,
    chart_drums: `Verse: Hi-hat eighths, snare 2&4, kick on 1\nChorus: Open hi-hat on beat 3, fill into chorus\nBridge: Half-time feel`,
    chart_vocals: `Verse 1:\nNeon sign and a jukebox hum\nTwo a.m. and the night ain't done\nShe's got whiskey in a coffee cup\nAnd a smile that says she's given up\n\nChorus:\nLast call at Lindy's\nLast song on the tape\nLast chance for something\nThat we couldn't make`,
    chart_keys: '',
    chart_other: '',
  });

  createSong(db, {
    title: 'Meridian',
    artist: 'The Hollow Frets',
    key: 'Em',
    tempo: 76,
    duration: '5:10',
    notes: '',
    chart_guitar: `Intro (fingerpicked):\nEm  Am  Em  Am\n\nVerse:\nEm  G  D  Am  (x4)\n\nChorus:\nC  G  D  Em  (x2)\nC  G  D  D\n\nBridge (half-time):\nAm  C  G  D  (x4)\n\nOutro:\nEm  Am  Em  (fade)`,
    chart_bass: `Intro: Arpeggiate Em and Am — let notes ring\nVerse: Long tones, minimal movement\nChorus: Moving line: C(root)→B→D walk-up\nBridge: Octaves, sparse — space is key`,
    chart_drums: `Intro: Brushes only, rim clicks\nVerse: Brush roll on snare, feather kick\nChorus: Switch to sticks, full kit\nBridge: Back to brushes, half-time\nOutro: Brushes fade to silence`,
    chart_vocals: `Verse 1:\nDown the meridian line\nWhere the highway meets the pine\nI've been watching for a sign\nThat this road has run its time\n\nChorus:\nBut the miles keep coming\nAnd the lights keep running\nAnd I'm somewhere in between\nThe life I had and where I've been`,
    chart_keys: '',
    chart_other: '',
  });

  createSong(db, {
    title: 'Copper Wire',
    artist: 'The Hollow Frets',
    key: 'G',
    tempo: 138,
    duration: '2:58',
    notes: '',
    chart_guitar: `Intro riff (electric):\ne|---------------------|\nB|---------------------|\nG|---------------------|\nD|---5-5-7-5-----------|\nA|-5---------8-7-5-3---|\nE|---------------------|\n(x4)\n\nVerse:\nG  C  G  D  (x4)\n\nChorus:\nC  D  Em  G  (x2)\nC  D  G  G\n\nSolo section: G  C  D  D  (x8)`,
    chart_bass: `Intro: Lock with kick drum, palm mute feel\nVerse: Root notes, eighth notes throughout\nChorus: Add the 5th on beats 3: G→D, C→G, D→A\nSolo: Drive it — lock with kick, let guitarist breathe`,
    chart_drums: `Intro: Kick-snare-kick-snare, 4 bars before band enters\nVerse: Driving 4/4, crash on 1 of verse\nChorus: Big open hi-hat on 2&4\nSolo: Push the energy — lots of crashes\nOutro: Slow roll into final hit`,
    chart_vocals: '',
    chart_keys: `Verse: Sustained pad, G major voicing — stay out of guitar's way\nChorus: Rhodes-style comping on off-beats\nSolo: Lay out (or hold root notes only)`,
    chart_other: '',
  });
}
