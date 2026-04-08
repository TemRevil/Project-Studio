import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setAudioCodec('aac');
Config.setConcurrency(1);
Config.setPublicDir('attachments');
Config.setEntryPoint('./src/Root.tsx');
