/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const Me = imports.misc.extensionUtils.getCurrentExtension();

function expandLocalPath(name) {
  return Me.path + "/" + name;
}

const St = imports.gi.St;
const GLib = imports.gi.GLib;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;

class Device {
  constructor() {
    this.deviceId = this.__retrieveDeviceIdCommand();

    if (!this.deviceId) {
      throw new Error('Cannot retrieve touch screen device ID');
    }

    this.updateState();
  }

  updateState() {
    this.state = this.__retrieveStatusCommand(this.deviceId);

    if (this.state == null) {
      throw new Error('Cannot retrieve status of touch screen device');
    }

    log('[Touch Screen Button]: device state updated - ' + this.state.toString());
  }

  enable() {
    this.__enableCommand(this.deviceId);
    this.updateState();
  }

  disable() {
    this.__disableCommand(this.deviceId);
    this.updateState();
  }

  __retrieveStatusCommand(deviceId) {
    let regExp = new RegExp(/Device Enabled.+:\s+([0-9]+)/);
    let res = this.__executeCommand('xinput list-props ' + deviceId);

    res = res && regExp.exec(res);

    if (res) {
      return res[1] == '1' ? true : false;
    } else {
      return null;
    }
  }

  __retrieveDeviceIdCommand() {
    let regExp = new RegExp(/06CB:19AC.+id=([0-9]+)/);
    let res = this.__executeCommand('xinput list');

    res = res && regExp.exec(res);

    if (res) {
      return res[1];
    } else {
      return null;
    }
  }

  __enableCommand(deviceId) {
    return this.__executeCommand('xinput enable ' + deviceId);
  }

  __disableCommand(deviceId) {
    return this.__executeCommand('xinput disable ' + deviceId);
  }

  __executeCommand(cmd) {
    log('[Touch Screen Button]: execute - ' + cmd);

    let resList = GLib.spawn_command_line_sync(cmd);
    let [res, out, err, status] = resList;

    if (res != true || status != 0) {
      log('[Touch Screen Button]: execute error - ' + err.toString());
      return null;
    } else {
      out = out.toString();
      log('[Touch Screen Button]: execute result - ' + out);
      return out;
    }
  }
}

const TouchScreenButton = new Lang.Class({
	Name: 'TouchScreenButton',
	Extends: PanelMenu.Button,

	_init: function() {
    const Gio = imports.gi.Gio;

    this._device = new Device();

		this.parent(1, 'TouchScreenButton', false);

		let box = new St.BoxLayout();
    let icon = new St.Icon({ style_class: "system-status-icon" });
    icon.set_gicon(Gio.icon_new_for_string(expandLocalPath('touchscreen-symbolic.svg')));

    let switchItem = new PopupMenu.PopupSwitchMenuItem('Touch Screen', this._device.state);

		box.add(icon);
		this.add_child(box);
		this.menu.addMenuItem(switchItem);

		switchItem.connect('toggled', Lang.bind(this, function(object, value) {
      this._device.state ? this._device.disable() : this._device.enable();
      object.setToggleState(this._device.state);
		}));
	},

	destroy: function() {
		this.parent();
	}
});

class Extension {
  constructor() {
    log("[Touch Screen Button]: constructor");
  }

  enable() {
    log("[Touch Screen Button]: enable");
    this.trayButton = new TouchScreenButton();
	  Main.panel.addToStatusArea('TouchScreenButton', this.trayButton, 0, 'right');
  }

  disable() {
    log('[Touch Screen Button]: disable')
    this.trayButton.destroy();
  }
}

function init() {
  log("[Touch Screen Button]: init");
  return new Extension();
}