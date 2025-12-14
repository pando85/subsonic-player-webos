<script setup lang="ts">
import GridWrapper from '@/components/Atoms/GridWrapper.vue';
import NoMediaMessage from '@/components/Atoms/NoMediaMessage.vue';
import DropdownItem from '@/components/Molecules/Dropdown/DropdownItem.vue';
import DropdownMenu from '@/components/Molecules/Dropdown/DropdownMenu.vue';
import PreloadImage from '@/components/Molecules/PreloadImage.vue';

defineProps<{
  playlists: Playlist[];
}>();

defineEmits<{
  deletePlaylist: [trackId: string];
  editPlaylist: [playlist: Playlist];
}>();
</script>

<template>
  <GridWrapper v-if="playlists.length" desktop="2" mobile="1" tablet="2">
    <article
      v-for="playlist in playlists"
      :key="playlist.id"
      :class="$style.playlist"
      data-test-id="playlist"
    >
      <NuxtLink
        :aria-label="`Go to playlist ${playlist.name}`"
        :class="['centerItems', $style.playlistLink]"
        draggable="false"
        :title="`Go to playlist ${playlist.name}`"
        :to="{
          name: ROUTE_NAMES.playlist,
          params: {
            [ROUTE_PARAM_KEYS.playlist.id]: playlist.id,
          },
        }"
      >
        <figure :class="$style.imageLink">
          <PreloadImage
            :alt="`${playlist.name} playlist`"
            :image="ICONS.playlist"
          />
        </figure>

        <div class="spaceBetween">
          <div>
            <h4 class="mBS">
              {{ playlist.name }}
            </h4>

            <ul class="bulletList smallFont">
              <li>{{ playlist.trackCount }} tracks</li>
              <li>
                <time>{{ playlist.formattedDuration }}</time>
              </li>
            </ul>
          </div>
        </div>
      </NuxtLink>

      <DropdownMenu :class="$style.dropdown">
        <DropdownItem
          ref="editPlaylist"
          @click="$emit('editPlaylist', playlist)"
        >
          Edit playlist
        </DropdownItem>
        <DropdownItem
          ref="deletePlaylist"
          @click="$emit('deletePlaylist', playlist.id)"
        >
          Delete playlist
        </DropdownItem>
      </DropdownMenu>
    </article>
  </GridWrapper>

  <NoMediaMessage
    v-else
    :icon="IMAGE_DEFAULT_BY_TYPE.playlist"
    message="No playlists found."
  />
</template>

<style module>
.playlist {
  position: relative;
  background-color: var(--track-background-color);
  box-shadow: var(--box-shadow-medium);
}

.playlistLink {
  gap: var(--default-space);
  padding: var(--default-space);
  color: inherit;
  text-decoration: none;
  transition: background-color var(--transition);

  &:hover {
    background-color: var(--hover-background-color);
  }
}

.imageLink {
  flex-shrink: 0;
  width: 75px;
}

.dropdown {
  position: absolute;
  top: var(--default-space);
  right: var(--default-space);
}
</style>
