# Milling-Machine-Gui
A graphical user interface for operating a milling machine.


Installation
-----
#### Follow these steps to install the program.

1. Install nodejs from www.nodejs.org/en.
1. Download Git for windows from https://git-for-windows.github.io/.
2. Open Windows Command Prompt by going to the start menu and searching 'Command Prompt'.
3. Run `cd Documents` then `git init` to initialize Git in your 'Documents' folder.
4. Run `git clone https://github.com/braydenaimar/Milling-Machine-Gui.git` to download the program into your 'Documents' folder.
4. Run `cd Milling-Machine-Gui` to open the file.
5. Run `npm install`.
5. Run `npm start` to launch the app.

\
This is roughly what command prompt should look like after completing the above steps:
```
C:\Users\YourName>cd Documents

C:\Users\YourName\Documents>git init
Initialized empty Git repository in C:/Users/YourName/Documents/.git/

C:\Users\YourName\Documents>git clone https://github.com/braydenaimar/Milling-Machine-Gui.git
Cloning into 'Milling-Machine-Gui'...
~some more output~

C:\Users\YourName\Documents>cd Milling-Machine-Gui

C:\Users\YourName\Documents\Milling-Machine-Gui>npm install
~a whack load of output~
~note that it is normal to see some warning and error-like messages here~

C:\Users\YourName\Documents\Milling-Machine-Gui>npm start
```

Windows Firewall may pop-up with a security alert but you just need to click `Allow Access`.

If you are having issues, you may need to add the program to the list of exclusions for Windows Defender.

#### Windows Defender Exclusion (**Not Applicable to Windows 10 Creators Update)**

1. Select `Start` and `Settings` to open the settings window.
2. Select `Update & Security`.
3. Select `Windows Defender` in the sidebar menu on the left.
4. Under 'Exclusions' select `Add an exclusion`.
5. Under 'Folders' select `Exclude a folder`.
6. Navigate to and select to the 'Milling-Machine-Gui' folder that you cloned from GitHub.
7. Select `Exclude this folder`.
8. Under 'Processes' select `Exclude a process`.
9. Navigate to and open the 'Milling-Machine-Gui' folder.
10. Open 'json_server' > 'windows_x64'.
11. Select the `serial-port-json-server.exe` file (Note, depending on your computer, this file may show as `serial-port-json-server` with a file type of 'Application').
12. Select `Exclude this file`.


Running the Program
-----

### Using File Explorer

1. Open Windows File Explorer.
2. Goto where you installed the program (in your 'Documents' folder if you followed the above instructions).
3. Open the 'Milling-Machine-Gui' folder.
4. Double click 'autostart.bat' to run the program.

You may want to create a shortcut to your desktop to access it more easily.

### Using Command Prompt

1. Open Windows Command Prompt by going to the start menu and searching 'Command Prompt'.
2. Run `cd Documents/Milling-Machine-Gui`.
3. Run `autostart.bat` to run the program.


File Tree
-----
Below a snapshot of the structure of files and folders of the application after installation on Windows.

```
Milling-Machine-Gui/
├── js/
|   ├── lib/
|   |   ├── amplify.core.js
|   |   ├── gui.js
|   |   ├── jquery.js
|   |   └── require.js
│   ├── require-config.js
│   ├── main.js
│   ├── settings-widget.js
│   ├── connection-widget.js
|   └── help-widget.js
├── css/
|   ├── fonts/
│   |   ├── fontawesome-webfont.eot
│   |   ├── glyphicons-halflings-regular.eot
│   |   └── ...
|   ├── lib/
|   |   ├── bootstrap-paper.min.css
|   |   ├── font-awesome.min.css
│   |   └── roboto-font.css
|   ├── main.css
│   ├── settings-widget.css
│   ├── connection-widget.css
|   └── help-widget.css
├── html/
│   ├── settings-widget.html
│   ├── connection-widget.html
|   └── help-widget.html
├── icons/
|   ├── boards/
|   |   ├── tinyg.jpg
|   |   └── tinygv9.jpg
|   |   └── ...
|   └── icon.png
├── json-server/
|   ├── windows_x64/
|   |   ├── arduino/
|   |   |   └── ...
|   |   ├── drivers/windows/
|   |   |   └── TinyGv2.inf
|   |   ├── sample-cert.pem
|   |   ├── sample-key.pem
|   |   └── serial-port-json-server.exe
|   └── linux_arm/
|       ├── arduino/
|       |   └── ...
|       ├── sample-cert.pem
|       ├── sample-key.pem
|       └── serial-port-json-server.exe
├── node_modules/
|   ├── cson/
|   |   └── ...
|   └── electron/
|       └── ...
├── icon.ico
├── index.js
├── main.html
└── package.json
```
