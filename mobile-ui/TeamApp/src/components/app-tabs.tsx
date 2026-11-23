import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const colors = Colors.light;

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      tintColor="#000000"
      labelVisibilityMode="labeled"
      labelStyle={{ default: { color: '#000000' }, selected: { color: '#000000' } }}>

      {/* <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger> */}

      {/* <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger> */}

      {/* My Own Stuff */}
      {/* <NativeTabs.Trigger name="login">
        <NativeTabs.Trigger.Label>Login</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger> */}

      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="accounts">
        <NativeTabs.Trigger.Label>Accounts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="key.fill"
          md="key_vertical"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="budget">
        <NativeTabs.Trigger.Label>Budget</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="dollarsign"
          md="attach_money"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="goals">
        <NativeTabs.Trigger.Label>Goals</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="checklist"
          md="add_task"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transactions">
        <NativeTabs.Trigger.Label>Transactions</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="arrow.up.arrow.down"
          md="swap_vert"
        />
      </NativeTabs.Trigger>

      {/* <NativeTabs.Trigger name="recurring">
        <NativeTabs.Trigger.Label>Recurring</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger> */}

    </NativeTabs>
  );
}
