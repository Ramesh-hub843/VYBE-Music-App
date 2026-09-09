import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const COLORS = {
  black: '#050706',
  surface: '#0B100D',
  card: '#101712',
  card2: '#151D18',
  green: '#31E981',
  green2: '#8CFFBD',
  muted: '#8C9891',
  text: '#F5F8F6',
  line: '#1D2821',
  danger: '#FF5268',
};

const DEMO_SONGS = [
  { id: '1', title: 'Midnight Drive', artist: 'VYBE Radio', duration: '3:42', icon: 'moon', colors: ['#0C2B1B', '#1BE37A'] },
  { id: '2', title: 'Afterglow', artist: 'Neon Trees', duration: '3:18', icon: 'sunny', colors: ['#173528', '#72FFB0'] },
  { id: '3', title: 'Lost In Motion', artist: 'Night City', duration: '4:06', icon: 'pulse', colors: ['#0A1912', '#36B978'] },
  { id: '4', title: 'Ocean Eyes', artist: 'Dream State', duration: '3:51', icon: 'water', colors: ['#0A241A', '#54EAA0'] },
  { id: '5', title: 'Electric Soul', artist: 'VYBE Originals', duration: '2:58', icon: 'flash', colors: ['#142018', '#24D873'] },
  { id: '6', title: 'Slow Morning', artist: 'Luna Park', duration: '4:20', icon: 'cafe', colors: ['#172019', '#8BFFBC'] },
];

function AlbumArt({ song, size = 64, radius = 16 }) {
  return (
    <LinearGradient
      colors={song?.colors || ['#102017', '#35E982']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      <View style={styles.artOrb} />
      <Ionicons name={song?.icon || 'musical-notes'} size={size * 0.34} color="#E8FFF1" />
    </LinearGradient>
  );
}

function IconButton({ name, onPress, active = false, size = 44, iconSize = 20 }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconButton, { width: size, height: size }, active && styles.iconButtonActive, pressed && { opacity: 0.65 }]}> 
      <Ionicons name={name} size={iconSize} color={active ? COLORS.green : COLORS.text} />
    </Pressable>
  );
}

function SongRow({ song, index, onPress, liked, onLike, compact = false }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.songRow, compact && { paddingVertical: 8 }, pressed && { opacity: 0.65 }]}>
      {!compact && <Text style={styles.songIndex}>{index + 1}</Text>}
      <AlbumArt song={song} size={compact ? 50 : 54} radius={14} />
      <View style={styles.songMeta}>
        <Text numberOfLines={1} style={styles.songTitle}>{song.title}</Text>
        <Text numberOfLines={1} style={styles.songArtist}>{song.artist}</Text>
      </View>
      <Text style={styles.songDuration}>{song.duration}</Text>
      <IconButton name={liked ? 'heart' : 'heart-outline'} active={liked} onPress={onLike} size={34} iconSize={18} />
      <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.muted} />
    </Pressable>
  );
}

export default function App() {
  const [tab, setTab] = useState('home');
  const [songs, setSongs] = useState(DEMO_SONGS);
  const [liked, setLiked] = useState(['2']);
  const [current, setCurrent] = useState(DEMO_SONGS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => () => { if (soundRef.current) soundRef.current.unloadAsync(); }, []);

  const toggleLike = (id) => setLiked((items) => items.includes(id) ? items.filter((x) => x !== id) : [...items, id]);

  const playSong = async (song) => {
    try {
      setLoading(true);
      if (soundRef.current) await soundRef.current.unloadAsync();
      if (song.uri) {
        const { sound } = await Audio.Sound.createAsync({ uri: song.uri }, { shouldPlay: true });
        soundRef.current = sound;
        setIsPlaying(true);
      } else {
        setIsPlaying(true);
      }
      setCurrent(song);
    } catch (error) {
      Alert.alert('Playback error', 'This file could not be played.');
    } finally { setLoading(false); }
  };

  const togglePlay = async () => {
    if (!current?.uri) { setIsPlaying((v) => !v); return; }
    if (!soundRef.current) return playSong(current);
    const status = await soundRef.current.getStatusAsync();
    if (status.isPlaying) { await soundRef.current.pauseAsync(); setIsPlaying(false); }
    else { await soundRef.current.playAsync(); setIsPlaying(true); }
  };

  const importMusic = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      const picked = result.assets.map((asset, i) => ({
        id: `local-${Date.now()}-${i}`,
        title: asset.name.replace(/\.[^/.]+$/, ''),
        artist: 'On My Device',
        duration: '--:--',
        uri: asset.uri,
        icon: 'musical-notes',
        colors: ['#102017', '#31E981'],
      }));
      setSongs((old) => [...picked, ...old]);
      if (picked[0]) playSong(picked[0]);
    } catch (error) { Alert.alert('Import failed', 'Please try selecting an audio file again.'); }
  };

  const filtered = songs.filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />
      <View style={styles.app}>
        {tab === 'home' && <Home songs={songs} liked={liked} onLike={toggleLike} onPlay={playSong} onSearch={() => { setTab('search'); setSearchFocused(true); }} />}
        {tab === 'search' && <Search query={query} setQuery={setQuery} focused={searchFocused} setFocused={setSearchFocused} songs={filtered} liked={liked} onLike={toggleLike} onPlay={playSong} />}
        {tab === 'library' && <Library songs={songs} liked={liked} onLike={toggleLike} onPlay={playSong} onImport={importMusic} />}

        {current && <MiniPlayer song={current} playing={isPlaying} onPlay={togglePlay} onOpen={() => setPlayerOpen(true)} />}
        <BottomBar tab={tab} setTab={(t) => { setTab(t); setSearchFocused(false); }} />
      </View>

      <Modal visible={playerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPlayerOpen(false)}>
        <Player song={current} playing={isPlaying} loading={loading} liked={liked.includes(current?.id)} onLike={() => toggleLike(current.id)} onPlay={togglePlay} onClose={() => setPlayerOpen(false)} onQueue={() => setQueueOpen(true)} />
      </Modal>
      <Modal visible={queueOpen} animationType="slide" transparent onRequestClose={() => setQueueOpen(false)}>
        <View style={styles.modalShade}><View style={styles.queueSheet}><View style={styles.sheetHandle} /><View style={styles.queueHeader}><Text style={styles.largeTitle}>Queue</Text><IconButton name="close" onPress={() => setQueueOpen(false)} /></View><Text style={styles.eyebrow}>NOW PLAYING</Text><SongRow song={current} index={0} compact liked={liked.includes(current?.id)} onLike={() => toggleLike(current.id)} onPress={() => {}} /><Text style={[styles.eyebrow, { marginTop: 18 }]}>NEXT UP</Text><FlatList data={songs.filter((s) => s.id !== current?.id).slice(0, 5)} keyExtractor={(s) => s.id} renderItem={({ item, index }) => <SongRow song={item} index={index} compact liked={liked.includes(item.id)} onLike={() => toggleLike(item.id)} onPress={() => { playSong(item); setQueueOpen(false); }} />} /></View></View>
      </Modal>
    </SafeAreaView>
  );
}

function Home({ songs, liked, onLike, onPlay, onSearch }) {
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.topBar}><View><Text style={styles.eyebrow}>GOOD EVENING</Text><Text style={styles.greeting}>Ramesh <Text style={{ fontSize: 22 }}>✦</Text></Text></View><View style={styles.profile}><Text style={styles.profileLetter}>R</Text></View></View>
    <Pressable onPress={onSearch} style={styles.searchPill}><Ionicons name="search" size={20} color={COLORS.muted} /><Text style={styles.searchPlaceholder}>Search songs, artists, albums...</Text><Ionicons name="mic-outline" size={19} color={COLORS.muted} /></Pressable>
    <Text style={styles.sectionTitle}>Your Vibe</Text>
    <LinearGradient colors={['#0B2115', '#143B25', '#09110C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroGlow} /><Text style={styles.heroSmall}>PERSONAL MIX</Text><Text style={styles.heroTitle}>Green After Dark</Text><Text style={styles.heroSub}>A late-night mix made for your mood.</Text><Pressable onPress={() => onPlay(songs[0])} style={styles.heroButton}><Ionicons name="play" size={15} color="#06100A" /><Text style={styles.heroButtonText}>Play Mix</Text></Pressable><View style={styles.heroArt}><Ionicons name="headset" size={54} color="#D7FFE7" /></View>
    </LinearGradient>
    <SectionHeader title="Made for You" action="See All" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
      {['Late Night', 'Focus Flow', 'Pure Energy'].map((name, i) => <Pressable key={name} onPress={() => onPlay(songs[i])} style={styles.mixCard}><LinearGradient colors={songs[i].colors} style={styles.mixArt}><Ionicons name={songs[i].icon} size={32} color="#E5FFF0" /></LinearGradient><Text style={styles.mixTitle}>{name}</Text><Text style={styles.mixSub}>{i + 8} songs • {i + 22} min</Text></Pressable>)}
    </ScrollView>
    <SectionHeader title="Recently Played" action="See All" />
    {songs.slice(0, 4).map((song, i) => <SongRow key={song.id} song={song} index={i} liked={liked.includes(song.id)} onLike={() => onLike(song.id)} onPress={() => onPlay(song)} />)}
    <View style={{ height: 110 }} />
  </ScrollView>;
}

function Search({ query, setQuery, focused, setFocused, songs, liked, onLike, onPlay }) {
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.pageTitle}>Search</Text>
    <View style={[styles.searchPill, focused && { borderColor: '#315D45' }]}><Ionicons name="search" size={20} color={COLORS.muted} /><TextInput autoFocus={focused} value={query} onChangeText={setQuery} onFocus={() => setFocused(true)} placeholder="Songs, artists, albums..." placeholderTextColor="#718078" style={styles.searchInput} /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 18 }}>
      {['All', 'Songs', 'Artists', 'Albums', 'Playlists'].map((item, i) => <View key={item} style={[styles.filter, i === 0 && styles.filterActive]}><Text style={[styles.filterText, i === 0 && { color: COLORS.black }]}>{item}</Text></View>)}
    </ScrollView>
    <SectionHeader title={query ? 'Results' : 'Trending Now'} action="" />
    {songs.map((song, i) => <SongRow key={song.id} song={song} index={i} liked={liked.includes(song.id)} onLike={() => onLike(song.id)} onPress={() => onPlay(song)} />)}
    <View style={{ height: 110 }} />
  </ScrollView>;
}

function Library({ songs, liked, onLike, onPlay, onImport }) {
  const likedSongs = songs.filter((s) => liked.includes(s.id));
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.topBar}><Text style={styles.pageTitle}>Library</Text><IconButton name="add" onPress={onImport} active /></View>
    <View style={styles.libraryGrid}>
      <LibraryCard icon="heart" label="Liked Songs" value={`${likedSongs.length || 0} songs`} color="#31E981" />
      <LibraryCard icon="list" label="Playlists" value="3 playlists" color="#8CFFBD" />
      <LibraryCard icon="albums" label="Albums" value="12 albums" color="#5AE69A" />
      <LibraryCard icon="download" label="Downloads" value="On device" color="#B4FFD0" />
    </View>
    <Pressable onPress={onImport} style={({ pressed }) => [styles.importCard, pressed && { opacity: 0.7 }]}><LinearGradient colors={['#11261A', '#0D1510']} style={StyleSheet.absoluteFillObject} /><View style={styles.importIcon}><Ionicons name="musical-notes" size={26} color={COLORS.green} /></View><View style={{ flex: 1 }}><Text style={styles.importTitle}>Import your music</Text><Text style={styles.importSub}>Add audio from your device for offline playback.</Text></View><Ionicons name="chevron-forward" size={21} color={COLORS.muted} /></Pressable>
    <SectionHeader title="Recently Added" action="See All" />
    {songs.map((song, i) => <SongRow key={song.id} song={song} index={i} liked={liked.includes(song.id)} onLike={() => onLike(song.id)} onPress={() => onPlay(song)} />)}
    <View style={{ height: 110 }} />
  </ScrollView>;
}

function LibraryCard({ icon, label, value }) {
  return <View style={styles.libraryCard}><View style={styles.libraryIcon}><Ionicons name={icon} size={19} color={COLORS.green} /></View><Text style={styles.libraryLabel}>{label}</Text><Text style={styles.libraryValue}>{value}</Text><Ionicons name="chevron-forward" size={16} color="#657169" style={{ position: 'absolute', right: 12, top: 14 }} /></View>;
}

function Player({ song, playing, loading, liked, onLike, onPlay, onClose, onQueue }) {
  return <LinearGradient colors={['#06100A', '#0A1510', '#020403']} style={{ flex: 1 }}>
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.playerTop}><IconButton name="chevron-down" onPress={onClose} /><View style={{ alignItems: 'center' }}><Text style={styles.eyebrow}>PLAYING FROM</Text><Text style={styles.playerSource}>VYBE LIBRARY</Text></View><IconButton name="ellipsis-horizontal" onPress={() => {}} /></View>
      <ScrollView contentContainerStyle={styles.playerContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={song.colors} style={styles.bigArt}><View style={styles.bigArtRing} /><Ionicons name={song.icon} size={88} color="#EAFFF2" /></LinearGradient>
        <View style={styles.playerMeta}><View style={{ flex: 1 }}><Text style={styles.playerTitle}>{song.title}</Text><Text style={styles.playerArtist}>{song.artist}</Text></View><IconButton name={liked ? 'heart' : 'heart-outline'} active={liked} onPress={onLike} /></View>
        <View style={styles.progress}><View style={styles.progressTrack}><View style={styles.progressFill} /></View><View style={styles.timeRow}><Text style={styles.timeText}>1:42</Text><Text style={styles.timeText}>{song.duration}</Text></View></View>
        <View style={styles.controls}><IconButton name="shuffle" onPress={() => {}} /><IconButton name="play-skip-back" onPress={() => {}} /><Pressable onPress={onPlay} style={styles.playCircle}>{loading ? <ActivityIndicator color={COLORS.black} /> : <Ionicons name={playing ? 'pause' : 'play'} size={29} color={COLORS.black} />}</Pressable><IconButton name="play-skip-forward" onPress={() => {}} /><IconButton name="repeat" onPress={() => {}} /></View>
        <View style={styles.playerOptions}><Pressable onPress={onQueue} style={styles.playerOption}><Ionicons name="list" size={19} color={COLORS.green} /><Text style={styles.playerOptionText}>Queue</Text></Pressable><Pressable style={styles.playerOption}><Ionicons name="text" size={19} color={COLORS.green} /><Text style={styles.playerOptionText}>Lyrics</Text></Pressable><Pressable style={styles.playerOption}><Ionicons name="airplay" size={19} color={COLORS.green} /><Text style={styles.playerOptionText}>Device</Text></Pressable></View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  </LinearGradient>;
}

function MiniPlayer({ song, playing, onPlay, onOpen }) {
  return <Pressable onPress={onOpen} style={({ pressed }) => [styles.miniPlayer, pressed && { opacity: 0.75 }]}><AlbumArt song={song} size={44} radius={12} /><View style={{ flex: 1, marginLeft: 12 }}><Text numberOfLines={1} style={styles.miniTitle}>{song.title}</Text><Text numberOfLines={1} style={styles.miniArtist}>{song.artist}</Text></View><IconButton name={playing ? 'pause' : 'play'} onPress={onPlay} active size={38} iconSize={18} /><IconButton name="play-skip-forward" onPress={() => {}} size={34} iconSize={18} /></Pressable>;
}

function BottomBar({ tab, setTab }) {
  const items = [['home', 'Home'], ['search', 'Search'], ['library', 'Library']];
  return <View style={styles.bottomBar}>{items.map(([key, label]) => <Pressable key={key} onPress={() => setTab(key)} style={styles.tab}><View style={[styles.tabIcon, tab === key && styles.tabIconActive]}><Ionicons name={tab === key ? key : `${key}-outline`} size={21} color={tab === key ? COLORS.green : COLORS.muted} /></View><Text style={[styles.tabLabel, tab === key && { color: COLORS.green }]}>{label}</Text></Pressable>)}</View>;
}

function SectionHeader({ title, action }) { return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Text style={styles.seeAll}>{action}</Text> : null}</View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.black }, app: { flex: 1, backgroundColor: COLORS.black },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }, topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  eyebrow: { color: '#728078', fontSize: 11, fontWeight: '700', letterSpacing: 1.4 }, greeting: { color: COLORS.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.7, marginTop: 3 },
  profile: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#193524', borderWidth: 1, borderColor: '#345F46', alignItems: 'center', justifyContent: 'center' }, profileLetter: { color: COLORS.green2, fontSize: 16, fontWeight: '800' },
  searchPill: { height: 50, borderRadius: 17, borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#0C120E', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 }, searchPlaceholder: { flex: 1, color: '#69766E', fontSize: 14 }, searchInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 12 }, sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }, seeAll: { color: COLORS.green, fontSize: 13, fontWeight: '700' },
  hero: { height: 205, borderRadius: 27, padding: 22, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#1D4A31' }, heroGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -50, top: -60, backgroundColor: '#2AE67A', opacity: 0.16 }, heroSmall: { color: COLORS.green2, fontSize: 10, fontWeight: '800', letterSpacing: 1.6 }, heroTitle: { color: COLORS.text, fontSize: 27, fontWeight: '800', marginTop: 9, letterSpacing: -0.7 }, heroSub: { color: '#A8B6AD', fontSize: 13, marginTop: 7, width: '65%', lineHeight: 19 }, heroButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COLORS.green, paddingHorizontal: 17, height: 38, borderRadius: 19, marginTop: 17 }, heroButtonText: { color: COLORS.black, fontWeight: '800', fontSize: 13 }, heroArt: { position: 'absolute', right: 25, bottom: 25, width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: '#55F49A', backgroundColor: '#102D1D', alignItems: 'center', justifyContent: 'center' },
  mixCard: { width: 135, marginRight: 13 }, mixArt: { height: 135, width: 135, borderRadius: 21, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, mixTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginTop: 9 }, mixSub: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  songRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 }, songIndex: { width: 17, color: '#56635B', fontSize: 12, textAlign: 'center' }, songMeta: { flex: 1, minWidth: 0 }, songTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' }, songArtist: { color: COLORS.muted, fontSize: 12, marginTop: 4 }, songDuration: { color: '#68756D', fontSize: 11, marginHorizontal: 2 },
  iconButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 99 }, iconButtonActive: { backgroundColor: '#153321' },
  artOrb: { position: 'absolute', width: '75%', height: '75%', borderRadius: 99, backgroundColor: '#D7FFE7', opacity: 0.07, top: '-12%', right: '-12%' },
  pageTitle: { color: COLORS.text, fontSize: 31, fontWeight: '800', letterSpacing: -0.8, marginBottom: 18 },
  filter: { paddingHorizontal: 16, height: 34, borderRadius: 17, backgroundColor: '#101712', borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }, filterActive: { backgroundColor: COLORS.green, borderColor: COLORS.green }, filterText: { color: '#AAB5AE', fontSize: 12, fontWeight: '700' },
  libraryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }, libraryCard: { width: (width - 50) / 2, minHeight: 105, borderRadius: 19, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, padding: 13 }, libraryIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#163421', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, libraryLabel: { color: COLORS.text, fontWeight: '700', fontSize: 13 }, libraryValue: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  importCard: { minHeight: 82, marginTop: 16, borderRadius: 21, borderWidth: 1, borderColor: '#214A32', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', padding: 15, gap: 13 }, importIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#163421', alignItems: 'center', justifyContent: 'center' }, importTitle: { color: COLORS.text, fontWeight: '800', fontSize: 14 }, importSub: { color: COLORS.muted, fontSize: 11, marginTop: 4, maxWidth: 240 },
  miniPlayer: { position: 'absolute', left: 12, right: 12, bottom: 72, height: 64, borderRadius: 20, backgroundColor: '#111913', borderWidth: 1, borderColor: '#284334', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, elevation: 12 }, miniTitle: { color: COLORS.text, fontWeight: '700', fontSize: 13 }, miniArtist: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  bottomBar: { height: 70, borderTopWidth: 1, borderTopColor: '#172019', backgroundColor: '#070B08', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 5 }, tab: { alignItems: 'center', justifyContent: 'center', width: 90, height: 62 }, tabIcon: { width: 40, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, tabIconActive: { backgroundColor: '#12271A' }, tabLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  playerTop: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, playerSource: { color: COLORS.text, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 4 }, playerContent: { padding: 22, alignItems: 'stretch' }, bigArt: { width: width - 44, height: width - 44, maxHeight: 410, borderRadius: 31, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#28563A' }, bigArtRing: { position: 'absolute', width: '68%', height: '68%', borderRadius: 999, borderWidth: 1, borderColor: '#B8FFD2', opacity: 0.16 }, playerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 25 }, playerTitle: { color: COLORS.text, fontSize: 25, fontWeight: '800', letterSpacing: -0.6 }, playerArtist: { color: COLORS.muted, fontSize: 14, marginTop: 5 }, progress: { marginTop: 25 }, progressTrack: { height: 4, borderRadius: 3, backgroundColor: '#27342C', overflow: 'hidden' }, progressFill: { width: '48%', height: 4, borderRadius: 3, backgroundColor: COLORS.green }, timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, timeText: { color: '#6D7972', fontSize: 10 }, controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 21 }, playCircle: { width: 66, height: 66, borderRadius: 33, backgroundColor: COLORS.text, alignItems: 'center', justifyContent: 'center' }, playerOptions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 }, playerOption: { height: 50, borderRadius: 17, backgroundColor: '#0E1711', borderWidth: 1, borderColor: COLORS.line, width: '31%', alignItems: 'center', justifyContent: 'center', gap: 4 }, playerOptionText: { color: '#B3BDB7', fontSize: 10, fontWeight: '700' },
  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'flex-end' }, queueSheet: { height: '82%', backgroundColor: '#09100B', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, borderTopWidth: 1, borderColor: '#284333' }, sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334139', alignSelf: 'center', marginBottom: 12 }, queueHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, largeTitle: { color: COLORS.text, fontSize: 28, fontWeight: '800' },
});
