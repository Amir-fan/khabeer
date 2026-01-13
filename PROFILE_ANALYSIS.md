# Profile Section Analysis

## ✅ What Works

1. **Header Navigation**
   - Back button works correctly
   - Title displays properly
   - RTL layout is correct

2. **Upgrade Banner**
   - Navigates to `/packages` correctly
   - Gradient styling looks good
   - Text is properly displayed

3. **Profile Card**
   - Shows user name and email from `useAuth` hook
   - Gradient background displays correctly
   - Edit button is present (but doesn't do anything yet)

4. **Menu Items Navigation**
   - "الباقة والاشتراك" → `/packages` ✅ Works
   - "سياسة الخصوصية" → `/privacy` ✅ Works
   - "الشروط والأحكام" → `/terms` ✅ Works
   - "تقدم للانضمام كشريك" → `/partner-signup` ✅ Now works (just added)

5. **Settings Toggles**
   - Notifications toggle - UI works, but state is local only (not persisted)
   - Dark mode toggle - UI works, but state is local only (not persisted)
   - Language - Shows "العربية" but doesn't do anything

6. **Logout**
   - Alert confirmation works
   - Calls `logout()` from `useAuth` hook
   - Navigates to `/auth` after logout

## ❌ What's Fake/Broken

1. **Stats Display (محادثة, ملف, سهم محفوظ)**
   - **Status**: FAKE - Shows "—" placeholders
   - **Issue**: `user?.stats?.conversations` doesn't exist in the User type
   - **Fix Needed**: 
     - Create a tRPC endpoint to fetch user stats (conversations count, files count, watchlist count)
     - Or remove the stats section if not needed
     - Currently shows hardcoded "—" values

2. **Edit Profile Button**
   - **Status**: BROKEN - Button exists but `onPress` is empty
   - **Issue**: No navigation or modal to edit profile
   - **Fix Needed**: 
     - Add navigation to edit profile screen
     - Or add modal to edit name/email

3. **سجل المحادثات (Conversation History)**
   - **Status**: FAKE - Shows placeholder alert "قريباً"
   - **Issue**: `onPress: () => {}` does nothing
   - **Fix Needed**: 
     - Implement conversation history screen
     - Or remove the menu item if not ready

4. **المحفوظات (Saved Items)**
   - **Status**: FAKE - Shows placeholder alert "قريباً"
   - **Issue**: `onPress: () => {}` does nothing
   - **Fix Needed**: 
     - Implement saved items screen (stocks, fatwas)
     - Or remove the menu item if not ready

5. **الإشعارات (Notifications Toggle)**
   - **Status**: PARTIALLY WORKING - Toggle works but state is not persisted
   - **Issue**: State is local only, doesn't sync with backend
   - **Fix Needed**: 
     - Add tRPC mutation to save notification preferences
     - Load preferences from backend on mount

6. **الوضع الداكن (Dark Mode Toggle)**
   - **Status**: PARTIALLY WORKING - Toggle works but doesn't actually change theme
   - **Issue**: State is local only, doesn't affect app theme
   - **Fix Needed**: 
     - Integrate with theme system
     - Persist preference to backend or local storage

7. **اللغة (Language)**
   - **Status**: FAKE - Shows "العربية" but doesn't do anything
   - **Issue**: No language switching functionality
   - **Fix Needed**: 
     - Implement language switching
     - Or remove if Arabic-only

8. **المساعدة والدعم (Help & Support)**
   - **Status**: BROKEN - `onPress: () => {}` does nothing
   - **Fix Needed**: 
     - Add help/support screen or link
     - Or open support email/chat

9. **عن التطبيق (About)**
   - **Status**: BROKEN - `onPress: () => {}` does nothing
   - **Fix Needed**: 
     - Add about screen with app version, credits, etc.
     - Version is hardcoded as "1.0.0"

## 🔧 What Needs Fixing

### High Priority

1. **Add Partner Signup Route** ✅ DONE
   - Created `/partner-signup` screen
   - Added to `_layout.tsx` routes
   - Added menu item in profile

2. **Fix Stats Display**
   - Create `user.stats` tRPC endpoint
   - Fetch: conversations count, files count, watchlist count
   - Display real data instead of "—"

3. **Implement Edit Profile**
   - Create edit profile screen or modal
   - Allow editing name, email, phone
   - Save changes via tRPC mutation

### Medium Priority

4. **Implement Conversation History**
   - Create `/history` or `/conversations` screen
   - Fetch user's conversation history from backend
   - Display list of past conversations

5. **Implement Saved Items**
   - Create `/saved` screen
   - Fetch saved stocks and fatwas
   - Display in organized list

6. **Persist Settings**
   - Save notification preferences to backend
   - Implement dark mode theme switching
   - Persist language preference

### Low Priority

7. **Add Help & Support**
   - Create support screen with contact info
   - Or integrate with support chat/email

8. **Add About Screen**
   - Display app version dynamically
   - Show credits, terms, privacy links

9. **Improve User Experience**
   - Add loading states for async operations
   - Add error handling for failed API calls
   - Add success feedback for actions

## 📝 Code Quality Issues

1. **Type Safety**
   - `user?.stats` doesn't exist in User type
   - Need to extend User type or fetch stats separately

2. **Error Handling**
   - No error handling for failed API calls
   - No loading states for async operations

3. **State Management**
   - Settings state is local only
   - Should sync with backend

4. **Navigation**
   - Some routes use `as any` type assertion
   - Should properly type all routes

## 🎯 Summary

**Working**: 6/15 features (40%)
- Header, upgrade banner, profile card, some navigation, logout, basic toggles

**Fake/Broken**: 9/15 features (60%)
- Stats, edit profile, conversation history, saved items, settings persistence, language, help, about

**Main Issues**:
1. Stats are fake (show "—")
2. Many menu items don't work (show alerts or do nothing)
3. Settings don't persist
4. No edit profile functionality

**Quick Wins**:
1. ✅ Partner signup route added
2. Remove or hide non-functional menu items
3. Add real stats endpoint
4. Implement edit profile modal
