const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
     .then(createWindowsInstaller)
     .catch((error) => {
     console.error(error.message || error)
     process.exit(1)
 })

function getInstallerConfig () {
    console.log('creating windows installer')
    const rootPath = path.join('./')
    const outPath = path.join(rootPath, 'installers')

    return Promise.resolve({
       appDirectory: path.join(rootPath, 'release-builds', 'McAfee1ClickMinigApp-win32-ia32'),
       authors: 'Safex Developers',
       noMsi: true,
       outputDirectory: outPath,
       exe: 'McAfee1ClickMinigApp.exe',
       setupExe: 'McAfee1ClickMinigAppWindowsInstaller.exe',
       setupIcon: 'public/images/icons/icon4.ico',
       skipUpdateIcon: true
   })
}
