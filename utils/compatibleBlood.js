function getCompatibleBlood(myBlood) {
    
    if(myBlood === 'AB positive') {
      return ['AB positive',  'A positive', 'B positive',  'O positive', 
      'AB negative','A negative','B negative','O negative']
    } else 
    if(myBlood === 'AB negative') {
      return ['AB negative','A negative','B negative','O negative']
    } else 
    if(myBlood === 'A positive') {
      return ['A positive',  'O positive', 'A negative','O negative']
    } else 
    if(myBlood === 'A negative') {
      return ['A negative','O negative']
    } else 
    if(myBlood === 'B positive') {
      return ['B positive',  'O positive','B negative','O negative']
    } else
    if(myBlood === 'B negative') {
      return ['B negative','O negative']
    } else
    if(myBlood === 'O positive') {
      return ['O positive','O negative']
    } else 
    if(myBlood === 'O negative') {
      return ['O negative']
    }
  }

module.exports = getCompatibleBlood;