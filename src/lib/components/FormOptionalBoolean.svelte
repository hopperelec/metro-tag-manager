<script lang="ts">
  let { name = undefined, label, value = $bindable() }: {
    name?: string | undefined;
    label: string;
    value: "off" | "ignore" | "on";
  } = $props();
</script>

<fieldset>
  <legend>{label}</legend>
  <div>
    <input bind:group={value} {name} title="No" type="radio" value="off" />
    <input bind:group={value} {name} title="Doesn't matter" type="radio" value="ignore" />
    <input bind:group={value} {name} title="Yes" type="radio" value="on" />
  </div>
</fieldset>

<style>
    fieldset {
        display: flex;
        align-items: center;
        border: 0;
        padding: 0;
        margin: 0;
    }

    legend {
        float: left;
    }

    div {
        display: flex; /* Remove gap */
        padding: .5ch;
    }

    input {
        appearance: none;
        height: 2em;
        width: 2em;
        margin: 0;
        display: flex;
        align-items: center;
        cursor: pointer;
        border: 1px solid #777;

        &:checked {
            border: 2px solid #000;
        }
    }

    [value="off"] {
        background-color: #f99;
        border-radius: 50% 0 0 50%;
        border-right: none;
        justify-content: right;

        &::after {
            content: "❌";
        }
    }

    [value="ignore"] {
        background-color: #ccc;
        border-left: none;
        border-right: none;
        justify-content: center;
    }

    [value="on"] {
        background-color: #9f9;
        border-radius: 0 50% 50% 0;
        border-left: none;

        &::after {
            content: "✔️";
        }
    }
</style>