import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppThunk } from '../index';

const DEV_SETTINGS_KEY = '@finly_dev_settings';

interface DevSettingsState {
  enableMockIAP: boolean;
  isLoading: boolean;
}

const initialState: DevSettingsState = {
  enableMockIAP: false,
  isLoading: true,
};

const devSettingsSlice = createSlice({
  name: 'devSettings',
  initialState,
  reducers: {
    setEnableMockIAP: (state, action: PayloadAction<boolean>) => {
      state.enableMockIAP = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setEnableMockIAP, setLoading } = devSettingsSlice.actions;

export const loadDevSettings = (): AppThunk => async (dispatch) => {
  try {
    const savedSettings = await AsyncStorage.getItem(DEV_SETTINGS_KEY);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.enableMockIAP !== undefined) {
        dispatch(setEnableMockIAP(parsed.enableMockIAP));
      }
    }
  } catch (error) {
    console.error('Failed to load dev settings:', error);
  } finally {
    dispatch(setLoading(false));
  }
};

export const toggleMockIAP = (enable: boolean): AppThunk => async (dispatch) => {
  try {
    dispatch(setEnableMockIAP(enable));
    // We need to merge with existing settings if we add more later
    const currentSettings = await AsyncStorage.getItem(DEV_SETTINGS_KEY);
    const parsed = currentSettings ? JSON.parse(currentSettings) : {};
    
    await AsyncStorage.setItem(DEV_SETTINGS_KEY, JSON.stringify({
      ...parsed,
      enableMockIAP: enable,
    }));
  } catch (error) {
    console.error('Failed to save dev settings:', error);
  }
};

export default devSettingsSlice.reducer;
